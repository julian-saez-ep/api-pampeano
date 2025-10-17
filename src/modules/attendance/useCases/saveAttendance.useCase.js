const saveAttendance = ( id, typeCheck ) => {
    let employee = '';
    const employeesList = getEmployeesList();
    const attendanceList = getAttendance();
    employeesList.forEach(el => {
        if ( el.registration_number === id ) {
            employee = el;
        }
    });

    attendanceList.forEach( el => {
        if(el.id === employee.id ){
            if( typeCheck === el.checkIn ) {
                registerCheckIn(el);
            } else {
                registerCheckOut(el);
            }
        }
    });
}
