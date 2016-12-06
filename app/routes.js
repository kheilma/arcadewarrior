module.exports = function(app, passport) {

app.get('/', /*isLoggedIn,*/ function(req, res) {
        res.render('index.ejs');//, {
           /* user: req.user
        }); 
            app.locals({
            email: req.user.email
        });*/
        //console.log(req.user);
        //console.log("dsaadssad");
    });


	app.get('/login', function(req, res) {

		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/', 
		failureRedirect : '/login', 
		failureFlash : true 
	}));


	app.get('/signup', function(req, res) {


		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/', 
		failureRedirect : '/signup', 
		failureFlash : true 
	}));


	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('profile.ejs', {
			user : req.user 
		});
	});

	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	app.get('/game', function(req, res) {
		res.render('game.ejs', {});
	});
};


function isLoggedIn(req, res, next) {


	if (req.isAuthenticated())
		return next();


	res.redirect('/login');
}