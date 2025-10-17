const parseXML = (xmlString) => {
    const result = {};
    
    const patterns = {
        eventType: /<eventType>(.*?)<\/eventType>/,
        eventState: /<eventState>(.*?)<\/eventState>/,
        dateTime: /<dateTime>(.*?)<\/dateTime>/,
        employeeNoString: /<employeeNoString>(.*?)<\/employeeNoString>/,
        name: /<name>(.*?)<\/name>/,
        currentVerifyMode: /<currentVerifyMode>(.*?)<\/currentVerifyMode>/,
        ipAddress: /<ipAddress>(.*?)<\/ipAddress>/
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
        const match = xmlString.match(pattern);
        if (match) {
            result[key] = match[1];
        }
    }
    
    return result;
}

module.exports = {
    parseXML
}
