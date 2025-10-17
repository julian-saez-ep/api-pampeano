export const responseGuard = (req, res, next) => {
    const originalJson = res.json;
    const originalSend = res.send;
    const originalStatus = res.status;

    let responseSent = false;

    res.json = function(data) {
        if (responseSent) {
            console.error('Intento de enviar múltiples respuestas:', {
                url: req.originalUrl,
                method: req.method,
                data
            });
            return res;
        }
        responseSent = true;
        return originalJson.call(this, data);
    };

    res.send = function(data) {
        if (responseSent) {
            console.error('Intento de enviar múltiples respuestas:', {
                url: req.originalUrl,
                method: req.method,
                data
            });
            return res;
        }
        responseSent = true;
        return originalSend.call(this, data);
    };

    res.status = function(code) {
        if (responseSent) {
            console.error('Intento de cambiar status después de enviar respuesta:', {
                url: req.originalUrl,
                method: req.method,
                statusCode: code
            });
            return res;
        }
        return originalStatus.call(this, code);
    };

    next();
};

export default responseGuard;
