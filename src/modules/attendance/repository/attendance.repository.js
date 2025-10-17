class AttendanceRepository {
    constructor(models, db, uid, password) {
        this.models = models;
        this.db = db;
        this.uid = uid;
        this.password = password;
    }

    /**
     * Crea un nuevo check-in para un empleado
     * @param {number} employeeId - ID del empleado en Odoo
     * @param {string} checkInTime - Hora del check-in en formato UTC
     * @returns {Promise<number>} - ID de la asistencia creada
     */
    async createCheckIn(employeeId, checkInTime) {
        console.log("\n📝 === CREANDO CHECK-IN ===");
        console.log("  Employee ID:", employeeId);
        console.log("  Check-in Time:", checkInTime);
        
        return new Promise((resolve, reject) => {
            // Validación de parámetros
            if (!employeeId || !checkInTime) {
                return reject(new Error("Parámetros inválidos para crear check-in"));
            }

            this.models.methodCall(
                'execute_kw',
                [
                    this.db,
                    this.uid,
                    this.password,
                    'hr.attendance',
                    'create',
                    [{
                        employee_id: parseInt(employeeId), // Asegurar que sea entero
                        check_in: checkInTime
                    }]
                ],
                (err, attendanceId) => {
                    if (err) {
                        console.error("❌ Error creando check-in:", err);
                        console.error("  Detalles:", err.faultString || err.message);
                        return reject(err);
                    }
                    
                    console.log("✅ Check-in creado exitosamente");
                    console.log("  Attendance ID:", attendanceId);
                    
                    // Verificar que se recibió un ID válido
                    if (!attendanceId || attendanceId === 0) {
                        console.error("⚠️ ID de asistencia inválido recibido:", attendanceId);
                        return reject(new Error("No se recibió un ID válido de la asistencia creada"));
                    }
                    
                    resolve(attendanceId);
                }
            );
        });
    }

    async getOpenAttendance( attendanceId ) {
        return new Promise((resolve, reject) => {
            this.models.methodCall(
                'execute_kw',
                [
                    [
                        this.db,
                        this.uid,
                        this.password,
                        'hr.attendance',
                        'search_read',
                    ],
                    [
                        [
                            ['employee_id', '=', employeeId],
                            ['check_out', '=', false]
                        ]
                    ],
                    {
                        fields: ['id', 'employee_id', 'check_in', 'check_out'],
                        limit: 1, 
                        order: 'check_in desc'
                    },
                    (err, result) => {
                        if(err) return reject(err);
                        resolve(result);
                    }
                ]
            )
        });
    };

    /**
     * Actualiza el check-out de una asistencia existente
     * @param {number} attendanceId - ID de la asistencia a actualizar
     * @param {string} checkOutTime - Hora del check-out en formato UTC
     * @returns {Promise<boolean>} - True si se actualizó correctamente
     */
    
    async updateCheckOut(attendanceId, checkOutTime) {
        console.log("\n📤 === REGISTRANDO CHECK-OUT ===");
        console.log("  Attendance ID:", attendanceId);
        console.log("  Check-out Time:", checkOutTime);
        console.log('Esto es lo que estoy recibiendo en el updateCheckout:', attendanceId, checkOutTime);
        
        return new Promise((resolve, reject) => {
            // Validación de parámetros
            if (!attendanceId || !checkOutTime) {
                return reject(new Error("Parámetros inválidos para actualizar check-out"));
            }

            this.models.methodCall(
                'execute_kw',
                [
                    this.db,
                    this.uid,
                    this.password,
                    'hr.attendance',
                    'write',
                    [
                        [parseInt(attendanceId)], // Array con el ID
                        { check_out: checkOutTime } // Datos a actualizar
                    ]
                ],
                (err, result) => {
                    if (err) {
                        console.error("❌ Error actualizando check-out:", err);
                        console.error("  Detalles:", err.faultString || err.message);
                        return reject(err);
                    }
                    
                    console.log("✅ Check-out actualizado exitosamente");
                    console.log("  Resultado:", result);
                    
                    return resolve(result);
                }
            );
        });
    }

    async getAttendancesByEmployee(employeeId, filters = {}) {
        return new Promise((resolve, reject) => {
            const domain = [['employee_id', '=', parseInt(employeeId)]];

            this.models.methodCall(
                'execute_kw',
                [
                    this.db,           
                    this.uid,         
                    this.password,  
                    'hr.attendance',
                    'search_read',
                    [
                        domain
                    ],
                    {
                        fields: ['employee_id', 'check_in', 'check_out'],
                        limit: 1,
                        order: 'check_in desc'
                    }
                ],
                (err, attendances) => {
                    if (err) {
                        console.error("❌ Error buscando asistencias:", err);
                        return reject(err);
                    }
                
                    return resolve(attendances);
                }
            )
        });
    }

    /**
     * Busca asistencias abiertas (sin check-out) de un empleado
     * @param {number} employeeId - ID del empleado
     * @returns {Promise<Object|null>} - Asistencia abierta más reciente o null
     */
    async findOpenAttendance(employeeId) {
        try {
            const attendances = await this.getAttendancesByEmployee(employeeId, {
                hasOpenCheckOut: true,
                limit: 1
            });
            
            if (attendances && attendances.length > 0) {
                const openAttendance = attendances[0];
                console.log("  ID:", openAttendance.id);
                console.log("  Check-in:", openAttendance.check_in);
                return openAttendance;
            }
            
            console.log("✅ No hay asistencias abiertas");
            return null;
        } catch (error) {
            console.error("❌ Error buscando asistencia abierta:", error);
            throw error;
        }
    }

    /**
     * Obtiene todos los empleados de Odoo
     * @returns {Promise<Array>} - Array de empleados
     */
    async getEmployees() {
        return new Promise((resolve, reject) => {
            this.models.methodCall(
                'execute_kw',
                [
                    this.db,
                    this.uid,
                    this.password,
                    'hr.employee',
                    'search_read',
                    [[]],
                    {
                        fields: [
                            'id', 
                            'name', 
                            'registration_number', 
                            'user_id',
                            'department_id',
                        ]
                    }
                ],
                (err, employees) => {
                    if (err) {
                        console.error("❌ Error obteniendo empleados:", err);
                        return reject(err);
                    }
                    
                    resolve(employees);
                }
            );
        });
    }

    async findEmployeeByRegistrationNumber(registrationNumber) {
        return new Promise((resolve, reject) => {
            this.models.methodCall(
                'execute_kw',
                [
                    this.db,
                    this.uid,
                    this.password,
                    'hr.employee',
                    'search_read',
                    [
                        [['registration_number', '=', registrationNumber.toString()]]
                    ],
                    {
                        fields: [
                            'id',
                            'name',
                            'registration_number',
                            'pin',
                            'barcode',
                            'user_id',
                            'department_id',
                            'job_id'
                        ],
                        limit: 1
                    }
                ],
                (err, employees) => {
                    if (err) {
                        console.error("❌ Error buscando empleado:", err);
                        return reject(err);
                    }
                    
                    if (employees && employees.length > 0) {
                        const employee = employees[0];
                        console.log("✅ Empleado encontrado:");
                        console.log("  ID:", employee.id);
                        console.log("  Nombre:", employee.name);
                        resolve(employee);
                    } else {
                        console.log("⚠️ Empleado no encontrado");
                        resolve(null);
                    }
                }
            );
        });
    }

    async canCheckIn(employeeId) {
        console.log("\n🔐 === VERIFICANDO SI PUEDE HACER CHECK-IN ===");
        console.log("  Employee ID:", employeeId);
        
        try {
            const openAttendance = await this.findOpenAttendance(employeeId);
            
            if (openAttendance) {
                const checkInDate = new Date(openAttendance.check_in);
                const now = new Date();
                const hoursDiff = (now - checkInDate) / (1000 * 60 * 60);
                
                return {
                    canCheckIn: false,
                    reason: "Tiene una asistencia abierta",
                    openAttendance: openAttendance,
                    hoursOpen: hoursDiff.toFixed(2)
                };
            }
            
            return {
                canCheckIn: true,
                reason: "No hay asistencias abiertas"
            };
            
        } catch (error) {
            console.error("❌ Error verificando estado:", error);
            throw error;
        }
    }

    /**
     * Cierra todas las asistencias abiertas antiguas
     * @param {number} hoursThreshold - Horas mínimas para considerar antigua (default: 24)
     * @returns {Promise<Object>} - Resumen de asistencias cerradas
     */
    async closeOldOpenAttendances(hoursThreshold = 24) {
        console.log("\n🧹 === CERRANDO ASISTENCIAS ANTIGUAS ===");
        console.log("  Umbral:", hoursThreshold, "horas");
        
        return new Promise((resolve, reject) => {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hoursThreshold);
            const cutoffDateStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
            
            // Buscar todas las asistencias abiertas antiguas
            this.models.methodCall(
                'execute_kw',
                [
                    this.db,
                    this.uid,
                    this.password,
                    'hr.attendance',
                    'search_read',
                    [
                        [
                            ['check_out', '=', false],
                            ['check_in', '<', cutoffDateStr]
                        ]
                    ],
                    {
                        fields: ['id', 'employee_id', 'check_in']
                    }
                ],
                async (err, oldAttendances) => {
                    if (err) {
                        console.error("❌ Error buscando asistencias antiguas:", err);
                        return reject(err);
                    }
                    
                    console.log(`📋 Encontradas ${oldAttendances.length} asistencias antiguas`);
                    
                    const closedAttendances = [];
                    
                    for (const attendance of oldAttendances) {
                        try {
                            // Cerrar al final del día del check-in
                            const checkInDate = new Date(attendance.check_in);
                            const closeDate = new Date(checkInDate);
                            closeDate.setHours(23, 59, 59);
                            
                            const closeTimeStr = closeDate.toISOString().slice(0, 19).replace('T', ' ');
                            
                            await this.updateCheckOut(attendance.id, closeTimeStr);
                            
                            closedAttendances.push({
                                id: attendance.id,
                                employeeId: attendance.employee_id[0],
                                employeeName: attendance.employee_id[1],
                                checkIn: attendance.check_in,
                                checkOut: closeTimeStr
                            });
                            
                            console.log(`✅ Cerrada asistencia ${attendance.id} de ${attendance.employee_id[1]}`);
                            
                        } catch (closeError) {
                            console.error(`❌ Error cerrando asistencia ${attendance.id}:`, closeError);
                        }
                    }
                    
                    resolve({
                        found: oldAttendances.length,
                        closed: closedAttendances.length,
                        attendances: closedAttendances
                    });
                }
            );
        });
    }

    /**
     * Obtiene un resumen de asistencias de un empleado
     * @param {number} employeeId - ID del empleado
     * @param {string} dateFrom - Fecha desde (YYYY-MM-DD)
     * @param {string} dateTo - Fecha hasta (YYYY-MM-DD)
     * @returns {Promise<Object>} - Resumen de asistencias
     */
    async getAttendanceSummary(employeeId, dateFrom, dateTo) {
        console.log("\n📊 === OBTENIENDO RESUMEN DE ASISTENCIAS ===");
        console.log("  Employee ID:", employeeId);
        console.log("  Desde:", dateFrom);
        console.log("  Hasta:", dateTo);
        
        try {
            const attendances = await this.getAttendancesByEmployee(employeeId, {
                dateFrom: `${dateFrom} 00:00:00`,
                dateTo: `${dateTo} 23:59:59`
            });
            
            let totalHours = 0;
            let openAttendances = 0;
            let completedAttendances = 0;
            
            attendances.forEach(att => {
                if (att.check_out) {
                    completedAttendances++;
                    totalHours += att.worked_hours || 0;
                } else {
                    openAttendances++;
                }
            });
            
            return {
                employeeId: employeeId,
                period: { from: dateFrom, to: dateTo },
                totalAttendances: attendances.length,
                completedAttendances: completedAttendances,
                openAttendances: openAttendances,
                totalHoursWorked: totalHours.toFixed(2),
                attendances: attendances
            };
            
        } catch (error) {
            console.error("❌ Error obteniendo resumen:", error);
            throw error;
        }
    }
}

export default AttendanceRepository;
