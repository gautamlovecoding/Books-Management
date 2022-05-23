const bookModel = require('../models/bookModel')
const userModel = require('../models/userModel')
const mongoose = require("mongoose")
const reviewModel = require('../models/reviewModel')
const aws = require('aws-sdk')

aws.config.update({
    accessKeyId: "AKIAY3L35MCRUJ6WPO6J",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile= async ( file) =>{
    return new Promise( function(resolve, reject) {
     // this function will upload file to aws and return the link
     let s3= new aws.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws
 
     var uploadParams= {
         ACL: "public-read",
         Bucket: "classroom-training-bucket",  //HERE
         Key: "abc/" + file.originalname, //HERE 
         Body: file.buffer
     }
 
 
     s3.upload( uploadParams, function (err, data ){
         if(err) {
             return reject({"error": err})
         }
         console.log(data)
         console.log("file uploaded succesfully")
         return resolve(data.Location)
     })
 
     // let data= await s3.upload( uploadParams)
     // if( data) return data.Location
     // else return "there is an error"
 
    })
 }



// validation for user sendind empty string
let keyValid = function (value) {
    if (typeof (value) == "undefined" || typeof (value) == null) { return false }
    if (typeof (value) === "string" && value.trim().length == 0) { return false }
    return true
}

///////////////////////// -CREATE BOOK- ///////////////////////////////
const createBooks = async function (req, res) {
    try {
        let data = req.body;
        
        // destructure
        let { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = data;

        // if (!Object.keys(data).length) return res.status(400).send({ status: false, message: "you must enter data for creating books" })

        // regex
        let excerptregex = /^[a-zA-Z,\-.\s]*$/
        let ISBNregex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/
        let categoryregex = /^[a-zA-Z,\s]*$/
        let dateRegex = /^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/

        //Check title
        if (!title) return res.status(400).send({ status: false, message: "you must give title" });
        if (!keyValid(title)) return res.status(400).send({ status: false, message: "Title should be valid" })

        let duplicateTitle = await bookModel.findOne({ title: title });
        if (duplicateTitle) return res.status(400).send({ status: false, message: "This title is already exist" })

        //Check excerpt
        if (!excerpt) return res.status(400).send({ status: false, message: "you must give excerpt of the book" })
        if (!excerpt.trim().match(excerptregex)) return res.status(400).send({ status: false, message: "please enter a excerpt of the book" })

        //Check userId
        if (!userId) return res.status(400).send({ status: false, message: "you must give UserId" });
        if (!mongoose.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Invalid user id." })

        let checkUser = await userModel.findById(userId)
        if (!checkUser) return res.status(400).send({ status: false, message: "User doesn't exist" });

        //Check ISBN
        if (!ISBN) return res.status(400).send({ status: false, message: "you must give ISBN" });
        if (!ISBN.trim().match(ISBNregex)) return res.status(400).send({ status: false, message: "ISBN must contain 10 to 13 digits." });

        let checkIsbn = await bookModel.findOne({ ISBN: ISBN });
        if (checkIsbn) return res.status(400).send({ status: false, message: "This ISBN is already exists" });

        //check category.
        if (!category) return res.status(400).send({ status: false, message: "please give the category of book" });
        if (!category.match(categoryregex)) return res.status(400).send({ status: false, message: "please enter valid category" });

        //check subcategory.
        if (!subcategory) return res.status(400).send({ status: false, message: "please give the category of book" });
        if (!categoryregex.test(subcategory)) return res.status(400).send({ status: false, message: "please enter valid subCategory" });

        subcategory = [...new Set(subcategory)]

        if (!releasedAt) return res.status(400).send({ status: false, message: "releasedAt must be present" });
        if (!releasedAt.trim().match(dateRegex)) return res.status(400).send({ status: false, message: "please enter valid date" })

        // **********************************************Authorization Check**************************************/
        if (req.headers['User-login'] !== data.userId)
            return res.status(400).send({ status: false, message: "you don't have authorised to create books of other's account" })
        /***********************************************************************************************************/

        let files = req.files
        
        if(!files || files.length==0){ 
           return res.status(400).send({ status : false,  msg: "No file found" })
        }

           //upload to s3 and get the uploaded link
            // res.send the link back to frontend/postman

        let uploadedFileURL= await uploadFile( files[0] )
            data.bookCover = uploadedFileURL
            
        //Creating books
        let newBook = await bookModel.create(data);
        res.status(201).send({ status: true, message: 'Success', data: newBook })

    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}

///////////////////////// -GET BOOK- ///////////////////////////////
const getBooks = async function (req, res) {
    try {
        let data = req.query

        let options = [{ userId: data.userId }, { category: data.category }, { subcategory: data.subcategory }]

        if (!Object.keys(data).length) {
            let filter = await bookModel.find({ $and: [data, { isDeleted: false }] }).select({ "_id": 1, "title": 1, "excerpt": 1, "userId": 1, "category": 1, "releasedAt": 1, "reviews": 1 }).sort({title: 1 })
            return res.status(200).send({ status: true, message: "Books list", data: filter })
        }

        let filter = await bookModel.find({ $or: options, isDeleted: false }).select({ "_id": 1, "title": 1, "excerpt": 1, "userId": 1, "category": 1, "releasedAt": 1, "reviews": 1 }).sort({ title: 1 })
        if (!filter.length)
            return res.status(404).send({ status: false, msg: "No such documents found" })
        res.status(200).send({ status: true, data: filter })

    }
    catch (error) { res.status(500).send({ status: false, message: error.message }) }

}

///////////////////////// -GET-BOOK-BY-ID ///////////////////////////////
const getBookFromBookId = async function(req, res){
    try{
        let data = req.params.bookId
    if(!data) return res.status(400).send({status: false, message: "BookId must be provide"});
    if(!mongoose.isValidObjectId(data)) res.status(400).send({status: false, message: "BookId must be valid"});


    const findBook = await bookModel.findOne({_id: data, isDeleted: false}).lean()
    if(!findBook) return res.status(404).send({status: false, message: "Book not found"});

    const reviewedBook = await reviewModel.find({bookId: data, isDeleted:false})

    findBook["reviewsData"] = reviewedBook

    return res.status(200).send({status: true, message: 'Book lists', data: findBook})

    
    }
    catch(error){
        res.status(500).send({status: false, message: error.message})
    }

}


///////////////////////// -UPDATE BOOK- ///////////////////////////////
const updateBook = async function (req, res) {
    try {
        /*************************************VALIDATION****************************************/
        if (!mongoose.isValidObjectId(req.params.bookId))
        return res.status(400).send({ status: false, msg: "Invalid Book objectId." })

        if (!Object.keys(req.body).length)
            return res.status(400).send({ status: false, msg: "No data provided to update." })

        let findBook = await bookModel.findOne({ _id: req.params.bookId, isDeleted: false })
        if (!findBook)
            return res.status(404).send({ status: false, msg: "No such documents found" })

        /******************************Authorization Check*****************************/
        if (req.headers['User-login'] != findBook.userId)
            return res.status(401).send({ status: false, msg: "You can't update this Book." })
        /*********************************************************************************/

        let { title, excerpt, ISBN } = req.body

        //Check title
        let duplicateTitle = await bookModel.findOne({ title: title });
        if (duplicateTitle) return res.status(400).send({ status: false, message: "This title is already exist" })

        //check ISBN
        let checkIsbn = await bookModel.findOne({ ISBN: ISBN });
        if (checkIsbn) return res.status(400).send({ status: false, message: "This ISBN is already exists" });

        //Update book
        let updatedbook = await bookModel.findOneAndUpdate({ _id: req.params.bookId, isDeleted: false },
            {
                title: title,
                excerpt: excerpt,
                releasedAt: Date.now(),
                ISBN: ISBN
            },
            { new: true })
        res.status(200).send({ status: true, data: updatedbook })
    }
    catch (error) { res.status(500).send({ status: false, message: error.message }) }
}

///////////////////////// -DELETE BOOK- ///////////////////////////////
const deleteBook = async function (req, res) {
    try {
        /*******************************VALIDATION***********************************/
        if (!mongoose.isValidObjectId(req.params.bookId))
            return res.status(400).send({ status: false, msg: 'Invalid Book id.' })

        /******************************Authorization Check*****************************/
        let authCheck = await bookModel.findById(req.params.bookId)
        if(!authCheck) return res.status(404).send({ status: false, message: "No Document found."})

        if (authCheck.userId != req.headers['User-login'])
            return res.status(401).send({ status: false, msg: "You don't have authority to delete this Book."})

        /*********************************************************************************/
    
        let deletedBook = await bookModel.findOneAndUpdate({ _id: req.params.bookId, isDeleted: false }, { isDeleted: true, deletedAt: Date.now() })
        if (!deletedBook)
            return res.status(404).send({ status: false, message: "No Document found." })
        res.status(200).send({ status: true, message: "Book has been deleted successfully" });
    }
    catch (err) {
        console.log(err.message)
        res.status(500).send({ status: false, msg: (err.message)})
    }
}



module.exports = { createBooks, updateBook, getBooks, deleteBook, getBookFromBookId}

