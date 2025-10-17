import toUTCForOdoo from '../../../utils/utc.js';
import mapHikvisionActionToOdoo from '../../../utils/map-actions.js';
import extractJsonFromMultipart from '../../../utils/extract-json-from-multipart.js';
import extractLocalTimeSimple from '../../../utils/extract-local-time-simple.js';
import AttendanceRepository from '../repository/attendance.repository.js';
import { odooConfig } from '../../../utils/odoo-config.js';
import OdooAuthService from '../../../services/OdooConnection.js';
import path from 'path';
import fs from 'fs';
const tz = 'America/Argentina/Buenos_Aires';

export const findOpenAttendanceByRequest = async (req, res) => {
  const employeeId = req.params.id;
    
  try {
    const odooAuthService = new OdooAuthService(odooConfig);
    const uid = await odooAuthService.authenticate();
    const repoAttendance = new AttendanceRepository(
      odooAuthService.getModelsClient(),
      odooConfig.db,
      uid,
      odooConfig.password
    );

    const searchResult = await repoAttendance.getAttendancesByEmployee(employeeId);

    if (searchResult && searchResult.length > 0) {
      const attendance = searchResult[0];
      return res.status(200).json(attendance);
    } else {
      return res.status(404).json(
        { 
          message: 'No se encontró asistencia abierta para este empleado', 
          date: new Date().toLocaleString('es-AR', {
            timeZone: tz,
            dateStyle: 'short',
            timeStyle: 'medium'
          })
        }
      );
    }
    
    
  } catch (error) {
    console.error("Error buscando asistencias abiertas:", error);
      
    // Manejar específicamente errores de conexión
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Servicio no disponible',
        message: 'No se pudo conectar con el servidor Odoo',
        details: error.message
      });
    }
      
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
}


// const autoCloseOldAttendance = async (attendance, currentEventDate) => {
//     const checkInDate = new Date(attendance.check_in);
//     const hoursDiff = (currentEventDate - checkInDate) / (1000 * 60 * 60);
    
//     if (hoursDiff > 24) {
//       const closeTime = new Date(checkInDate);
//       closeTime.setHours(23, 59, 59);
      
//       const closeTimeStr = toUTCForOdoo(closeTime.toISOString());
      
//       await this.attendanceRepository.updateCheckOut(attendance.id, closeTimeStr);
//       return true;
//     }
    
//     return false;
// }

const registerCheckIn = async (req, res, hikvisionAction) => {  
  try {
    const { employeeNo, eventTime } = req.body;
    const odooAuthService = new OdooAuthService(odooConfig);
    const uid = await odooAuthService.authenticate();
    const attendanceRepo = new AttendanceRepository(
      odooAuthService.getModelsClient(),
      odooConfig.db,
      uid,
      odooConfig.password
    );
    
    // Validar datos requeridos
    if (!employeeNo || !eventTime) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos requeridos: employeeNo o eventTime",
      });
    }
    
    // Obtener todos los empleados de Odoo
    const employees = await attendanceRepo.getEmployees();
    
    const getDigits = (v) => (v ?? '').toString().replace(/\D/g, '');
    // Buscar el empleado por su número de registro
    const employee = employees.find(
      (emp) => getDigits(emp.registration_number) === getDigits(employeeNo.toString())
    );
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Empleado con número de registro ${employeeNo} no encontrado en Odoo`,
      });
    }
    
    const utcTime = toUTCForOdoo(eventTime);
    const eventDate = new Date(eventTime);
    console.log("ESTE ES EL UTC:", utcTime);
    
    // Mapear la acción de Hikvision a Odoo
    const mappedAction = mapHikvisionActionToOdoo(hikvisionAction);
    
    // Buscar asistencias abiertas del empleado
    const openAttendance = await attendanceRepo.findOpenAttendance(employee.id);
    
    // Determinar la acción final
    let finalAction;
    if (mappedAction) {
      // Si el terminal especifica la acción, usarla
      finalAction = mappedAction;
    } else {
      // Si no hay acción específica, determinar por asistencia abierta
      finalAction = openAttendance ? 'checkout' : 'checkin';
    }

    // Ejecutar la acción correspondiente
    if (finalAction === 'checkout' && openAttendance) {
      // Verificar si es una asistencia muy antigua
      const checkInDate = new Date(openAttendance.check_in);
      const hoursDiff = (eventDate - checkInDate) / (1000 * 60 * 60);
      
      // Actualizar el check-out
      await attendanceRepo.updateCheckOut(
        openAttendance.id,
        utcTime
      );
      
      return res.status(200).json({
        success: true,
        message: "CheckOut registrado exitosamente",
        data: {
          employeeName: employee.name,
          checkIn: openAttendance.check_in,
          checkOut: utcTime,
          action: 'checkout',
          hoursWorked: hoursDiff.toFixed(2),
          terminalAction: hikvisionAction
        },
      });
      
    }
    
    if (finalAction === 'checkin') {
      if(openAttendance) {
        if (!openAttendance.check_out) {
          console.log("--- No se registrará el check in de este usuario debido a que no ha registrado su salida desde su último ingreso. ----", "Empleado:", employee.name);
          return {
            success: true,
            message: "No se registrará el check in de este usuario debido a que no ha registrado su salida desde su último ingreso.",
            data: {
              employeeName: employee.name,
              checkIn: openAttendance.check_in,
              checkOut: utcTime,
              action: 'checkout',
              terminalAction: hikvisionAction
            },
          }
        }
      }

      const result = await attendanceRepo.createCheckIn(
        employee.id,
        utcTime
      );
    
      return res.status(201).json({
        success: true,
        message: "CheckIn registrado exitosamente",
        data: {
          attendanceId: result,
          employeeId: employee.id,
          employeeName: employee.name,
          checkIn: utcTime,
          action: "checkin",
          terminalAction: hikvisionAction
        },
      });
    } else {
      const result = await attendanceRepo.createCheckIn(
        employee.id,
        utcTime
      );
      
      return res.status(201).json({
        success: true,
        message: "CheckIn registrado (no había asistencia abierta para checkout)",
        data: {
          attendanceId: result,
          employeeId: employee.id,
          employeeName: employee.name,
          checkIn: utcTime,
          action: "checkin",
          note: "Se esperaba checkout pero no había asistencia abierta",
          terminalAction: hikvisionAction
        },
      });
    }
    
  } catch (error) {
    console.error("❌ Error al registrar asistencia:", error);
    
    // Manejar error específico de Odoo
    if (error.faultString && error.faultString.includes("no ha registrado su salida")) {
      const errorMatch = error.faultString.match(/desde (.+)$/);
      const openSince = errorMatch ? errorMatch[1] : "fecha desconocida";
    
      return res.status(409).json({
        success: false,
        error: "El empleado tiene una asistencia sin cerrar",
        details: {
          openSince: openSince,
          message: "Debe cerrar la asistencia anterior antes de crear una nueva",
          suggestion: "El próximo evento registrará la salida automáticamente"
        }
      });
    }
    
    if (res.headersSent) {
      console.error("No se puede enviar error, headers ya enviados");
      return;
    }
    
    return res.status(500).json({
      success: false,
      error: "Error interno al registrar asistencia",
      details: error.message,
    });
  }
}

const getRequestBody = ( body, headers ) => {
  let eventData = null;
  let employeeId = null;
  let employeeName = null;
  let eventTime = null;
  let hikvisionAction = null;

  const contentType = headers["content-type"] || "";
    
  if (contentType.includes("multipart/form-data")) {
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1].trim();
      eventData = extractJsonFromMultipart(body, boundary);
    }
  } else if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    eventData = body;
  } else if (typeof body === 'string') {
    try {
      eventData = JSON.parse(body);
    } catch (e) {
      console.log("⚠️ No es un JSON válido");
    }
  }
  
  // Extraer información del evento
  if (eventData.AccessControllerEvent) {
    employeeId = eventData.AccessControllerEvent.employeeNoString;
    employeeName = eventData.AccessControllerEvent.name;
    hikvisionAction = eventData.AccessControllerEvent.attendanceStatus;
    eventTime = eventData.AccessControllerEvent.time || eventData.dateTime;
  }
  
  // Fallback para otras estructuras de datos
  if (!employeeId) {
    employeeId = eventData.employeeNoString || eventData.employeeNo;
    employeeName = eventData.name;
    hikvisionAction = eventData.attendanceStatus;
    eventTime = eventData.time || eventData.dateTime;
  }

  return {
    eventData,
    employeeId,
    employeeName,
    eventTime,
    hikvisionAction
  }
}

export const sendAttendance = async (req, res) => {
  try {
    const data = getRequestBody(req.body, req.headers);
    if (!data.employeeId || !data.eventTime) {
      console.log("Sin datos de empleado para procesar");
      return res.status(200).json({
        success: true,
        message: "Sin datos de empleado para procesar"
      });
    }

    if (!data.eventData) {
      console.log("Sin datos para procesar")
      return res.status(200).json({
        success: false,
        message: "Sin datos para procesar"
      });
    }

    console.log("  🆔 ID Empleado:", data.employeeId, "  👤 Nombre:", data.employeeName || "Sin nombre", "  🎯 Acción Hikvision:", data.hikvisionAction || "No especificada");
    
    const localTime = extractLocalTimeSimple(data.eventTime);
    
    const processedData = {
      employeeNo: data.employeeId,
      eventTime: localTime,
      _debug: {
        originalTime: data.eventTime,
        correctedTime: localTime,
        employeeName: data.employeeName,
        hikvisionAction: data.hikvisionAction,
        source: "Hikvision Terminal"
      }
    };
    
    req.body = processedData;
    const result = await registerCheckIn(req, res, data.hikvisionAction);

    if(result.success){
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: "Error procesando webhook",
        details: error.message
      });
    }
  }
}

// const closeOldAttendances = async () => {
//   try {
//     // Buscar todas las asistencias abiertas de más de 24 horas
//     const yesterday = new Date();
//     yesterday.setDate(yesterday.getDate() - 1);
//     const yesterdayStr = yesterday.toISOString().split('T')[0];
    
//     const oldOpenAttendances = await new Promise((resolve, reject) => {
//       this.attendanceRepository.models.methodCall(
//         'execute_kw',
//         [
//           this.attendanceRepository.db,
//           this.attendanceRepository.uid,
//           this.attendanceRepository.password,
//           'hr.attendance',
//           'search_read',
//           [
//             [
//               ['check_out', '=', false],
//               ['check_in', '<', yesterdayStr]
//             ]
//           ],
//           {
//             fields: ['id', 'employee_id', 'check_in'],
//           }
//         ],
//         (err, result) => {
//           if (err) return reject(err);
//           resolve(result);
//         }
//       );
//     });
    
//     for (const attendance of oldOpenAttendances) {
//       const checkInDate = new Date(attendance.check_in);
//       const closeDate = new Date(checkInDate);
//       closeDate.setHours(23, 59, 59); // Cerrar al final del día
      
//       const closeTimeStr = toUTCForOdoo(closeDate.toISOString());
      
//       await this.attendanceRepository.updateCheckOut(attendance.id, closeTimeStr);
//     }
//   } catch (error) {
//     console.error("Error en limpieza de asistencias:", error);
//   }
// }
