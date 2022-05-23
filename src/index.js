const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const route = require('./routes/route.js');
const mongoose = require('mongoose');

const multer = require('multer')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use( multer().any())

mongoose.connect("mongodb+srv://sankalesh8668:790602030305@cluster0.pymsd.mongodb.net/group24Database", {
    useNewUrlParser: true
})
.then( () => console.log("MongoDb is connected"))
.catch ( err => console.log(err) )

app.use("/", route)

app.listen(process.env.PORT || 3000, (err)=> {
    console.log("Connected to PORT 3000")
})