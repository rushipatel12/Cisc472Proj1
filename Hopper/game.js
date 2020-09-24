//global variables
var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight-10;
var player;
var platforms = [];
var obstacles = [];
var invincibilities = [];
var invincible = false;
var spawnable = true;
var gravity;
var running;
var spawnRates;
var ids;
var fallSpeed;
var platformWidth;
var platformHeight;
var obstacleWidth;
var obstacleHeight;
var invincibilitySide;
var updateScore;
var score;
var scrollScale = 1;
var highscore = 0;
var paused;
var clicked = false;
var userEmail;
var highscoreEmail;

var firebaseConfig = {
    apiKey: "AIzaSyDkvzHdqgDZqGVgTOgTJwAS4Eb_2pqtd-I",
    authDomain: "loginpage-c59cf.firebaseapp.com",
    databaseURL: "https://loginpage-c59cf.firebaseio.com",
    projectId: "loginpage-c59cf",
    storageBucket: "loginpage-c59cf.appspot.com",
    messagingSenderId: "1084810558085",
    appId: "1:1084810558085:web:e1e02a3ae06928d90e07ec",
    measurementId: "G-63XFW9CB2Z"
  };
  
firebase.initializeApp(firebaseConfig);
firebase.auth().onAuthStateChanged(user => {
    if (!!user){
        userEmail = user.email;
        $(".registeration").hide();
        $(".menutext").show();
        $(".menu").show();
        $(".player").show();
        startMenu();
    }
  });
  
  $("#loginemail").click(()=>{
    firebase.auth().signInWithEmailAndPassword($("#email").val(), $("#password").val()).catch(function(error) {
      var errorCode = error.code;
      var errorMessage = error.message;
      alert(errorMessage);
    });
  });
  $("#register").click(()=>{
    let pwd1 = $("#password").val();
    let pwd2 = $("#password2").val();
    if (pwd1 == pwd2){
      firebase.auth().createUserWithEmailAndPassword($("#email").val(), $("#password").val()).catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        alert(errorMessage);
      });
    } else {
      alert("Passwords don't match");
    }
  });
  $("#reset").click(()=>{
    firebase.auth().sendPasswordResetEmail($("#email").val());
  });


var loginMenu = ()=>{
    $(".menu").hide();
    firebase.auth().signOut().then(function() {
        // Sign-out successful.
        console.log("Logged out in Menu");
      }, function(error) {
        // An error happened.
      });
    $(".deathMenu").hide();
    $(".menutext").hide();
    $(".player").hide();
}

var startMenu = ()=>{ //menu to display at start of game
    $(document).keydown(()=>{
        $(".menu").hide();
        $(document).off('keydown');
        startGame();
    });
}
var deathMenu = ()=>{ //menu to display once player dies
    // $(".menutext").empty();
    $(".deathMenu").html(`<p>CURRENT USER: ${userEmail.toUpperCase()}</p><p>SCORE: ${score}</p><p>HIGHSCORE: ${highscore} BY: ${highscoreEmail.toUpperCase()}</p><p>PRESS THE ENTER KEY TO RESTART</p><p><button id="logout">Logout</button></p>`);
    $(".menutext").hide();
    $(".deathMenu").show();
    $("#logout").click(()=>{
        firebase.auth().signOut().then(function() {
            // Sign-out successful.
            location.reload();
            console.log("Logged out in Button");
            clearGame();
            $("#email").val('');
            $("#password").val('');
            $("#password2").val('');
            loginMenu();
            $(".registeration").show();
      }, function(error) {
        // An error happened.
      });
    });
    $(".menu").show();
    $(document).keypress(function(event){
        if (event.keyCode == 13){
            $(".menu").hide();
            // $(document).off('keydown');
            clearGame();
            startGame();
        }
    });
}

var startGame = ()=>{
    //trying to scale everything with viewport size so it works the same on any device
    gravity = screenHeight/500000;

    //player constants
    let width = screenWidth/10;
    let height = screenHeight/7; //player size
    let x = screenWidth/2-width/2, y=0; //player starting point
    let jumpSpeed = screenHeight/1500; // jumpspeed
    let moveSpeed = screenWidth/1100; // movespeed
    let score = 0;
    let invincible = false;

    player = new Player(width,height,x,y,moveSpeed,jumpSpeed,score,invincible); // initializing player
    
    fallSpeed = screenHeight/250; //platform fall speed
    platformWidth = screenWidth/6.6;
    platformHeight = screenHeight/40; //platform size scaled off player size
    obstacleWidth = screenWidth/10;
    obstacleHeight = screenHeight/10;//*.85 //obstacle size scaled off player size
    invincibilitySide = player.height*.5;
    spawnRates = {'platform':.02,'obstacle':.01, 'invincibility':.01}; //spawnrates of objects
    ids = {'platform':1,'obstacle':1, 'invincibility':1} //map for unique ids when generating objects


    platforms.push(new Platform(platformWidth,platformHeight,x,y+100,fallSpeed,-1)); //start platform
    platforms.push(new Platform(platformWidth,platformHeight,x+200,y-100,fallSpeed,-2)); //start platform
    platforms.push(new Platform(platformWidth,platformHeight,x-200,y-300,fallSpeed,-3)); //start platform

    paused = false; //track whether game is paused

    //interval to keep keep track and display score
    updateScore = setInterval(function(){ //update score every second
        if (!paused){
            player.score += 10;
            $('.score').text("SCORE: " + player.score);
        }
    }, 1000); //update every second

    $(document).keydown(inputHandler);
    $(document).keyup(inputHandler);
    running = setInterval(()=>updateGame(20),20); //updates game every 5 ms;

}

var calcScrollScale = ()=>{ //used to calculate how fast to scroll platforms
    var scrollMargin = 0.4;
    scrollScale = 1+(1-((player.y/screenHeight)-scrollMargin));
}

var updateGame = (delta) =>{ //update all objects of game
    player.update(delta);
    generateObjects();
    for(platform of platforms) platform.update(delta);
    for(obstacle of obstacles) obstacle.update(delta);
    for(invincibility of invincibilities) invincibility.update(delta);
}

var keys = {'ArrowLeft':false,'ArrowRight':false, ' ':false}; //map for keypresses

//handles keypresses
var inputHandler = (evt)=>{
    switch(evt.type){
        case 'keydown': keys[evt.key] = true;break;
        case 'keyup': keys[evt.key] = false;break;
        default: break;
    }

    if(keys['ArrowLeft']){
        player.velocity[0] = -player.moveSpeed;
    }
    else if(keys['ArrowRight']){ 
        player.velocity[0] = player.moveSpeed;
    }
    else if(keys[' ']){
        paused = !paused;
        pauseGame();
    }
    else player.velocity[0] = 0;
}

var inScreen = point => (point[1] < screenHeight && point[0] < screenWidth); //takes [x,y] coordinates and returns true if in bounds;

//object collision
var collision = (o1,o2) =>{
    return(o1.x < o2.x + o2.width &&
        o1.x + o1.width > o2.x &&
        o1.y < o2.y + o2.height &&
        o1.y + o1.height > o2.y);
} 

//Player class
class Player{

    constructor(width,height,x,y,moveSpeed,jumpSpeed,score,invincibile){
        
        this.width = width; 
        this.height = height;
        this.x = x; //x position
        this.y = y; // y position
        this.moveSpeed = moveSpeed; //constant velocity in x direction
        this.jumpSpeed = jumpSpeed; //initial velocity in y direction on jump
        this.velocity = [0,0]; // (x,y) velocity vector
        this.score = score;
        this.invincibile = invincibile; //whether player has invincible power-up or not
        
  
        $('.player').animate({width:width,height:height,left:x,top:y},0); //initializes object graphically 
        $('.score').text("SCORE: " + this.score);
        $('.score').animate({left:0,top:0},0);
        $('.timer').text("");
        $('.timer').animate({left:0,top:40},0);
    }

    //player update function, delta: time passed since last update.


    update(delta){
        var thisPlayer = this; // used to reference player inside loops

        calcScrollScale();

        //dont spawn obstacles or invincibility until score of 50
        if (this.score <= 50){
            spawnRates['obstacle'] = 0;
            spawnRates['invincibility'] = 0;
        }
        else{
            spawnRates['obstacle'] = .01;
            spawnRates['invincibility'] = .01;
        }

        this.x += this.velocity[0]*delta;
        this.y += this.velocity[1]*delta*scrollScale;

        this.velocity[1] += gravity*delta;

        if(this.y > 0){
            for(let pf of platforms){ //check for collisions with platforms
                if(collision(this,pf)){
                    this.velocity[1] = -this.jumpSpeed; //jump if falling and hit platform
                }
            }
            //jump if invinvible and hit bottom
            if (invincible && (this.y + this.height) >= (screenHeight-25)){
                this.velocity[1] = -this.jumpSpeed; 
            }
        }
        else if(this.y < -75){
            this.y = -75;
            this.velocity[1] = 0;
        }

        for(let obs of obstacles){ //check for collision with obstacles
            if(collision(this,obs)){
                obs.die(); //remove from list
                if (!invincible){
                    this.die(); //die if hit obstacle
                }
            } 
        } 

        for (let invs of invincibilities){ //check to hit invincible objects
            if (collision(this, invs)){ 
                invincibilities = [];
                $(".invincibilities").empty();
                invincible = true;
                var timeleft = 10;
                $('.timer').text("INVINCIBILITY: " + (timeleft));
                $('.player').css("filter","sepia(100%) saturate(800%) brightness(100%) hue-rotate(90deg)");
                $('.player').css("animation","flash linear .5s infinite");
                var updateTimer = setInterval(function(){ //start 10 second timer once invincible
                    timeleft -= 1;
                    $('.timer').text("INVINCIBILITY: " + (timeleft));
                    if(timeleft <= 0 || (thisPlayer.y + thisPlayer.height >= screenHeight)){ //reset if player dies or after 10 seconds
                        $('.timer').text("");
                        invincible = false;
                        $('.player').css("filter","");
                        $('.player').css("animation","");
                        clearInterval(updateTimer);
                    }
                }, 1000); //update every second
            }
        }
        
        
        if(this.x + this.width > screenWidth) this.x = screenWidth-this.width; //too far right
        else if(this.x < 0) this.x = 0; //too far left
        
        if(this.y + this.height >= screenHeight){this.die()} //hits bottom;
    
        $('.player').animate({left:this.x,top:this.y},0);
        $('.score').animate({left:0,top:0},0);
    }

    die(){
        clearGame();
        deathMenu();
    }


}
class Platform{
    constructor(width,height,x,y,fallSpeed,id){
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.velocity = [0,fallSpeed];
        this.id = 'platform' + id;

        //adds platform to parent which holds all platforms and displays it
        $("<div class = platform id =" + this.id +"></div>").appendTo('.platforms')
        .animate({width:width,height:height,left:x,top:y},0);
    }

    update(delta){ //update position and animate platform
        this.x += this.velocity[0];
        this.y += this.velocity[1]*scrollScale;
        if(this.y+this.height > screenHeight) this.die();
        else $('#'+this.id).animate({left:this.x,top:this.y},0);
    }

    die(){
        $('#'+this.id).remove(); //remove from html
        platforms = platforms.filter(pf => pf.id!=this.id); //remove from list;
    }
}

class Obstacle{
    constructor(width,height,x,y,fallSpeed,id){
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.velocity = [0,fallSpeed];
        this.id = 'obstacle' + id;

        //adds obstacle to parent which holds all objects and displays it
        $("<img class = obstacle id =" + this.id +" src=rock.gif>").appendTo('.obstacles')
        .animate({width:width,height:height,left:x,top:y},0);
    }

    update(delta){ //update position and animate obstacle
        this.x += this.velocity[0];
        this.y += this.velocity[1]*scrollScale;
        if(this.y+this.height > screenHeight) this.die();
        else $('#'+this.id).animate({left:this.x,top:this.y},0);
    }

    die(){
        $('#'+this.id).remove(); //remove from html
        obstacles = obstacles.filter(ob => ob.id!=this.id); //remove from list;
    }
}

class Invincibility{
    constructor(width,height,x,y,fallSpeed,id){
        this.width = invincibilitySide;
        this.height = invincibilitySide;
        this.x = x;
        this.y = y;
        this.velocity = [0,fallSpeed];
        this.id = 'invincibility' + id;

        //adds invincibility power-up to parent which holds all objects and displays it
        $("<div class = invincibility id =" + this.id +"></div>").appendTo('.invincibilities')
        .animate({width:width,height:height,left:x,top:y},0);
    }

    update(delta){ //update position and animate invincibility
        this.x += this.velocity[0];
        this.y += this.velocity[1]*scrollScale;
        if(this.y+this.height > screenHeight) this.die();
        else $('#'+this.id).animate({left:this.x,top:this.y},0);
    }

    die(){
        $('#'+this.id).remove(); //remove from html
        invincibilities = invincibilities.filter(ob => ob.id!=this.id); //remove from list;
    }
}

var noSpawn = 0; //counts how many times platform does not spawn

var generateObjects = ()=>{
    xBound = screenWidth/150;
    yBound = screenHeight/150;
    if(Math.random() < spawnRates['platform'] || noSpawn > 30){
        let legalPlatform = false;
        let x = Math.random() * (screenWidth-player.width)
        let y = 0; //random x position, y starts at top
        var newPlat = new Platform(platformWidth,platformHeight,x,y,fallSpeed,ids['platform']);
        while(!legalPlatform) { //only add platform thats not intersecting another platform
            x = Math.random() * (screenWidth-player.width)
            y = 0; //random x position, y starts at top
            newPlat.x = x;
            platforms.forEach(function(pf) { //check for collision with existing platforms
                legalPlatform = !collisionSpawn(pf,newPlat,xBound,yBound);
            });
        }
        platforms.push(newPlat);
        ids['platform']++;
        noSpawn = 0;
    }
    else noSpawn+=1; 
    
    if (platforms[platforms.length-1] && platforms[platforms.length-1].y >= screenHeight/2){ //spawn a saving platform if no random platforms spawn for the player to use
        var savePlatform = new Platform(platformWidth, platformHeight, screenWidth/2, 0, fallSpeed, ids['platform']);
        platforms.push(savePlatform);
        ids['platform']++;
    }

    
 
    if(Math.random() < spawnRates['obstacle']){ //spawn random obstacles
        let x = Math.random() * (screenWidth-player.width*5),y = 0; //random x position, y starts at top
        obstacles.push(new Obstacle(obstacleWidth,obstacleHeight,x,y,fallSpeed,ids['obstacle']));
        ids['obstacle']++;
    }

    if(Math.random() < spawnRates['invincibility'] && !invincible){ //spawn random invincibilities
        let x = Math.random() * (screenWidth-player.width*5),y = 0; //random x position, y starts at top
        invincibilities.push(new Invincibility(invincibilitySide,invincibilitySide,x,y,fallSpeed,ids['invincibility']));
        ids['invincibility']++;
    }
}

var collisionSpawn = (existing, newObj, xBound, yBound) => { //check collision of spawning objects
    existing.width += 2*xBound;
    existing.height += 2*yBound;
    return collision(existing, newObj);
}

var clearGame = ()=>{ //clear all aspects of game
    clearInterval(running); 
    clearInterval(updateScore);
    platforms = [];
    obstacles = [];
    invincibilities = [];
    score = player.score;
    if(player.score>=highscore){
        highscore = player.score;
        highscoreEmail = userEmail;
    }
    // highscore = Math.max(player.score,highscore);
    $(".platforms").empty();
    $(".obstacles").empty();
    $(".invincibilities").empty();
    $(".score").empty();
    $(".timer").empty();
}

var pauseGame = ()=>{ //pause game
    if (paused){
        clearInterval(running);
    }
    else {
        if(invincible){
        }
        running = setInterval(()=>updateGame(20),20); //updates game every 5 ms;
    }
}
