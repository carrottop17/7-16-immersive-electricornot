var express = require('express');
var router = express.Router();
var multer = require('multer'),
	bodyParser = require('body-parser'),
	path = require('path');
var upload = multer({ dest: 'uploads/' });


//1. connect to mongodb
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/lego'
var db; //global so all of our routes have access to the db connection

mongoClient.connect(mongoUrl, function(error, database){
	if(error){
		console.log(error) //print out the error because there is one
	}else{
		db = database;
		console.log('connected to Mongo successfully');
	}
});

/* GET home page. */
//get all pictures from the MongoDB
//get the current user from Mongo
//find out what pictures the current user has voted on
//load thos pictures in an array
//pick a random one
//send the random one to EJS via a res.render('index', {picsArray})

router.get('/', function(req, res, next) {

	//5. find all the photos the user has voted on and load an array up with them
	db.collection('votes').find({ip:req.ip}).toArray(function (error, userResult){
		var photosVoted = [];
		if(error){
			console.log("there was an error fetching user votes")
		}else{
			// console.log(userResult);
			for(var i = 0; i<userResult.length; i++){
				photosVoted.push(userResult[i].image);
			}
		}


		//2. get pics from mongo and store them in an array to pass to view
		//6. Limit the query to photos not voted on.
		db.collection('images').find({imgSrc: { $nin: photosVoted } }).toArray(function(error, photos){
			if (photos.length === 0){
				res.redirect('/standings')
			}else{
			//3. grab a random image from that array
			var randomNum = Math.floor(Math.random() * photos.length);
			var randomPhoto = photos[randomNum].imgSrc;
			//4. send that image to the view
			res.render('index', { imageToRender: randomPhoto });
			}
		});
	});
});

router.post('/electric', function(req, res, next){
	// res.json(req.body);
	//1. we know whether they voted electric or poser because its in req.body.submit
	//2. we know what image they voted on because it's in req.body.image
	//3. we know who they are because we have their IP address
if(req.body.submit == 'Lego!'){
	var upDownVote = 1;
}else if(req.body.submit == "Fake!"){
	var upDownVote = -1;
}
	db.collection('votes').insert({
		ip: req.ip,
		vote: req.body.submit,
		image: req.body.image
	});

	//7. update the images collection so that the image voted will have a new total votes
	db.collection('images').find({imgSrc: req.body.image}).toArray(function(error, result){
		var total;
		if(isNaN(result[0].totalVotes)){
			total = 0;
		}else{
			total = result[0].totalVotes;
		}
		db.collection('images').updateOne(
			{ imgSrc: req.body.image},
			{
				$set: {"totalVotes": (total + upDownVote)}
			}, function(error, results){
				//check to see if there is an error
				//check to see if the document was updated
			}
		)
	})

	res.redirect('/');
});

router.get('/standings', function(req, res, next){
	db.collection('images').find().toArray(function(error, allResults){
		allResults.sort(function(a,b){
			return (b.totalVotes - a.totalVotes);
		});
		res.render('standings', {theStandings: allResults});
	});
})

router.get('/resetUserVotes', (req, res, next) =>{
	db.collection('votes').deleteMany(
			{ip:req.ip},
			function(error, results){

			}
		);
		res.redirect('/');
});

router.get('/', function(req, res){
  res.render('index');
});
//multer
router.post('/', multer({ dest: './public/images/'}).single('upl'), function(req,res){
	console.log(req.body); //form fields
	/* example output:
	{ title: 'abc' }
	 */
	console.log(req.file); //form files
	/* example output:
            { fieldname: 'upl',
              originalname: 'grumpy.png',
              encoding: '7bit',
              mimetype: 'image/png',
              destination: './uploads/',
              filename: '436ec561793aa4dc475a88e84776b1b9',
              path: 'uploads/436ec561793aa4dc475a88e84776b1b9',
              size: 277056 }
	 */
	res.status(204).end();

	db.collection('images').insert({
		imgSrc: req.file.filename
	});
});

module.exports = router;
