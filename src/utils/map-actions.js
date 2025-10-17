const mapHikvisionActionToOdoo = ( hikvisionAction ) => {
  const actionMap = {
    'checkIn': 'checkin',
    'checkOut': 'checkout',
    'breakIn': 'checkin',
    'breakOut': 'checkout',
    'overtimeIn': 'checkin',
    'overtimeOut': 'checkout'
  };
  
  return actionMap[hikvisionAction] || null;
}

export default mapHikvisionActionToOdoo;
