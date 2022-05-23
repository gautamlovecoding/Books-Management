const express = require('express');
const router = express.Router();

const userController = require("../controllers/userController")
const bookController = require("../controllers/bookController")
const reviewController = require("../controllers/reviewController")
const middleware = require("../middleWare/auth");

//////////////////// -USER APIS- ////////////////

router.post("/register", userController.register)
router.post("/login", userController.login)
    
//////////////////// -BOOK APIS- ////////////////

router.post("/books", middleware, bookController.createBooks);

router.get("/books", middleware, bookController.getBooks)

router.get("/books/:bookId", middleware, bookController.getBookFromBookId)

router.put("/books/:bookId", middleware, bookController.updateBook)

router.delete("/books/:bookId", middleware, bookController.deleteBook)

//////////////////// -REVIEWS-API- ////////////////

router.post("/books/:bookId/review", reviewController.createReview );

router.put("/books/:bookId/review/:reviewId", reviewController.updateReview)

router.delete("/books/:bookId/review/:reviewId", reviewController.deleteReview)



module.exports = router;