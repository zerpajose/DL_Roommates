const http = require("http");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const querystring = require("querystring");
const url = require('url');

/**
 * Funcion para controlar el debe y recibe de un roomate al registrar o modificar un gasto
 */

function modificarDebeRecibe(arregloRoomates, body){

    let ratioOtros = (arregloRoomates.length - 1)/arregloRoomates.length; //0.75
        
    let debeCu = ((ratioOtros * parseInt(body.monto))/(arregloRoomates.length - 1))*-1; //-2500

    let reciboYo = ratioOtros * parseInt(body.monto); //7500

    let roommateAux = [];

    arregloRoomates.forEach((e) => {

        if(e.debe == null || e.debe == ''){
            e.debe = 0;
        }
        
        if(e.recibe == null || e.recibe == ''){
            e.recibe = 0;
        }

        e.debe = parseInt(e.debe);
        e.recibe = parseInt(e.recibe);
    
        if(e.nombre !== body.roommate){ //Todos excepto el que paga

            let deb = e.debe+debeCu;
            
            let roommate = {
                idMate: e.idMate,
                nombre: e.nombre,
                debe: deb.toString(),
                recibe: e.recibe.toString(),
            };

            roommateAux.push(roommate);
        }
        else{

            reciboYo = e.recibe + reciboYo;
            
            let roommate = {
                idMate: e.idMate,
                nombre: e.nombre,
                debe: e.debe.toString(),
                recibe: reciboYo.toString(),
            };
            
            roommateAux.push(roommate);
        }
        
    });

    return roommateAux;
}

http.createServer(function(req, res) {

    if (req.url == "/" && req.method == "GET") {

        res.writeHead(200, { 'Content-Type': 'text/html' });

        fs.readFile('index.html', 'utf-8', (err, data) => {
            res.end(data);
        });

    }

    /**
     * roommates por GET
     */

    let roomates = JSON.parse(fs.readFileSync("mates.json", "utf8"));

    if (req.url.startsWith("/roommates") && req.method == "GET") {

        res.writeHead(200, { 'Content-Type': 'text/html' });
        
        res.end(JSON.stringify(roomates));
    }

    /**
     * roomates por POST
     */

    if (req.url.startsWith("/roommates") && req.method == "POST") {

        res.writeHead(200, { 'Content-Type': 'text/html' });

        let body;

        req.on("data", (payload) => {
            body = JSON.parse(payload);
        });

        req.on("end", () => {

            axios.get("https://randomuser.me/api/").then((info) => {
                                
                let roommate = {
                    idMate: uuidv4().slice(30),
                    nombre: info['data']['results'][0]['name']['first'] + " " + info['data']['results'][0]['name']['last'],
                    debe: "",
                    recibe: "",
                };

                roomates.push(roommate);
                fs.writeFileSync("mates.json", JSON.stringify(roomates, null, " "));
                res.end(JSON.stringify("Roommate cargado exitosamente"));
            
            })
            .catch((e) => {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                console.log(e);
            });
        });
    }

    /**
     * gastos por GET
     */

    let gastos = JSON.parse(fs.readFileSync("gastos.json", "utf8"));

    if (req.url.startsWith("/gasto") && req.method == "GET") {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        
        res.end(JSON.stringify(gastos));
        
    }

    /**
     * gastos por POST
     */

    if (req.url.startsWith("/gasto") && req.method == "POST") {
        res.writeHead(200, { 'Content-Type': 'text/html' });

        let body;

        req.on("data", (payload) => {
            body = JSON.parse(payload);
        });

        req.on("end", () => {

            roomates = modificarDebeRecibe(roomates, body);

            fs.writeFileSync("mates.json", JSON.stringify(roomates, null, " "));
            
            let gasto = {
                id: uuidv4().slice(30),
                descripcion: body.descripcion,
                monto: body.monto,
                roommate: body.roommate
            };

            gastos.push(gasto);

            fs.writeFileSync("gastos.json", JSON.stringify(gastos, null, " "));
            res.end(JSON.stringify("Gasto cargado exitosamente"));

        });
    }

    /**
     * gastos por PUT
     */

    if (req.url.startsWith("/gasto") && req.method == "PUT") {
        res.writeHead(200, { 'Content-Type': 'text/html' });
       
        let body;
        let queryObject;

        req.on("data", (payload) => {

            body = JSON.parse(payload);

            queryObject = url.parse(req.url, true).query;

        });

        req.on("end", () => {

            roomates = modificarDebeRecibe(roomates, body);

            fs.writeFileSync("mates.json", JSON.stringify(roomates, null, " "));

            for (let i of gastos){

                if (i.id == queryObject.id){
                    i.roommate=body.roommate;
                    i.descripcion=body.descripcion;
                    i.monto=body.monto;
                    break;
                }
            }
          
            fs.writeFileSync("gastos.json", JSON.stringify(gastos, null, " "));
            res.end("Gasto editado correctamente");
        });
    }

    /**
     * gastos por DELETE
     */ 

    if (req.url.startsWith("/gasto") && req.method == "DELETE") {
        res.writeHead(200, { 'Content-Type': 'text/html' });
       
        const { id } = url.parse(req.url, true).query;
        
        gastos = gastos.filter((b) => b.id !== id);
        
        fs.writeFileSync("gastos.json", JSON.stringify(gastos, null, " "));
        res.end("Gasto eliminado correctamente");
    }

}).listen(3000, ()=>{
    console.log("Servidor levantado en puerto 3000");
});
