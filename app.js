const net = require('net');

const server = net.createServer((socket) => {
    console.log('Nueva conexión de GPS');

    let receivedData; // Variable de mayor alcance para almacenar los datos recibidos

    socket.on('data', (data) => {
        console.log('Datos recibidos:', data);
        receivedData = data; // Asigna los datos recibidos a la variable de mayor alcance

        // Verifica si el mensaje es de tipo 01 (registro de terminal)
        if (data.length >= 2 && data[0] === 0x78 && data[1] === 0x78 && data[3] === 0x01) {
            console.log('Mensaje de registro recibido');
            
            // Prepara la respuesta de confirmación
            const response = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x01, 0xD9, 0xDC, 0x0D, 0x0A]);
            
            // Envía la confirmación al GPS
            socket.write(response);
            console.log('Respuesta de confirmación enviada');
            return;
        } else if (data.length >= 4 && data[3] === 0x12) {
            // Procesamiento específico para mensajes de protocolo 0x12
            console.log('Mensaje de ubicación recibido');
            
            try {
                // Procesar los datos recibidos
                const parsedData = parseLocation(data);
                console.log(parsedData);

                const decodedLat = decodeGt06Lat(parsedData.lat, parsedData.course);
                const decodedLon = decodeGt06Lon(parsedData.lon, parsedData.course);

                console.log('Latitud decodificada:', decodedLat);
                console.log('Longitud decodificada:', decodedLon);
            } catch (err) {
                console.error('Error al parsear los datos:', err.message);
            }
            return;
        } else {
            console.log('Mensaje desconocido recibido');
        }
    });

    socket.on('end', () => {
        console.log('Cliente desconectado');
    });

    socket.on('error', (err) => {
        console.error('Error:', err);
    });
});

// Función para parsear la ubicación desde el buffer de datos recibidos
function parseLocation(data) {
    let datasheet = {
        startBit: data.readUInt16BE(0),
        protocolLength: data.readUInt8(2),
        protocolNumber: data.readUInt8(3),
        fixTime: data.slice(4, 10),
        quantity: data.readUInt8(10),
        lat: data.readUInt32BE(11),
        lon: data.readUInt32BE(15),
        speed: data.readUInt8(19),
        course: data.readUInt16BE(20),
        mcc: data.readUInt16BE(22),
        mnc: data.readUInt8(24),
        lac: data.readUInt16BE(25),
        cellId: parseInt(data.slice(27, 30).toString('hex'), 16),
        serialNr: data.readUInt16BE(30),
        errorCheck: data.readUInt16BE(32)
    };
    return datasheet;
}

// Función para decodificar la latitud
function decodeGt06Lat(lat, course) {
    var latitude = lat / 30000.0 / 60.0;
    if (!(course & 0x0400)) {
        latitude = -latitude;
    }
    return Math.round(latitude * 1000000) / 1000000;
}

// Función para decodificar la longitud
function decodeGt06Lon(lon, course) {
    var longitude = lon / 30000.0 / 60.0;
    if (!(course & 0x0800)) {
        longitude = -longitude;
    }
    return Math.round(longitude * 1000000) / 1000000;
}

// Inicia el servidor en el puerto 4000
server.listen(4000, () => {
    console.log('Servidor TCP escuchando en el puerto 4000');
});
