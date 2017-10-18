var express = require('express');
var router = express.Router();
var shortid = require('shortid');
var path = require("path");
var fs = require('fs');
var bittrex = require('node-bittrex-api');
bittrex.options({
	'apikey' : process.env.BITTREX_API_KEY,
	'apisecret' : process.env.BITTREX_API_SECRET,
});

/* GET home page. */
router.get('/', function(req, res, next) {
	var arr = marketsToArray();
	res.render('index', { arr: arr });
});

router.get('/newPosition', function(req, res, next) {

	addNewPosition(req.query.market, req.query.quantity, req.query.buy_price);

	var arr = marketsToArray();
	res.render('index', { arr: arr });
});

router.get('/editPosition', function(req, res, next) {

	editPosition(req.query.market, req.query.id, req.query.stop_loss, req.query.take_profit);

	var arr = marketsToArray();
	res.render('index', { arr: arr });
});

router.get('/deletePosition', function(req, res, next) {

	deletePosition(req.query.market, req.query.id);

	var arr = marketsToArray();
	res.render('index', { arr: arr });
});

var markets = {};

Position = function(market, quantity, buy_price) {
	this.id = shortid.generate();
	this.market = market;
	this.quantity = quantity;
	this.buy_price = buy_price;
	this.stop_loss = buy_price * 0.95;
	this.take_profit = buy_price * 1.10;
	this.lastTicker = 0;
	this.open_order = false;
	this.error_order = false;
}

editPosition = function(market, id, new_stop_loss, new_take_profit) {
	var pos;

	for(var i=0; i<markets[market].length; i++) {
		if(markets[market][i].id == id) {
			pos = markets[market][i];
			break;
		}
	}

	if(new_stop_loss) {
		pos.stop_loss = new_stop_loss;
	} 

	if(new_take_profit) {
		pos.take_profit = new_take_profit;
	}
}

scan = function() {
	for(var market in markets) {

		if(markets[market] != []) {
			var posArr = markets[market];

			updateTicker(market, function(price) {
				for(var i=0; i<posArr.length; i++) {
					var pos = posArr[i];

					pos.lastTicker = price;

					if(pos.open_order==false && pos.error_order==false) {
						if(price >= pos.take_profit) {
							//Take Profit
							takeProfit(pos);
						}
						else if(price <= pos.stop_loss) {
							//Stop Loss
							stopLoss(pos);
						}
					}
				}
			});
		}
	}
}


updateTicker = function(market, callback) {
	bittrex.getticker( { market : market }, function( data, err ) {
		callback(data.result.Last);
	});
}

addNewPosition = function(market, quantity, buy_price) {
	var pos = new Position(market, quantity, buy_price);

	if(markets[market] == undefined) {
		markets[market] = [];
	}

	markets[market].push(pos);
}

deletePosition = function(market, id) {
	markets[market] = markets[market].filter(function(pos) {
		return pos.id != id;
	});
}

sellPosition = function(pos, price) {
	pos.open_order = true;

	bittrex.tradesell({
		MarketName: pos.market,
		OrderType: 'LIMIT',
		Quantity: pos.quantity,
		Rate: price,
		TimeInEffect: 'GOOD_TIL_CANCELLED',
		ConditionType: 'NONE',
		Target: 0,
	}, function(data, err) {
		if(err) {
			pos.open_order = false;
			pos.error_order = true;
			console.log(err);
			return;
		}
		console.log('o', data);
	});
}

stopLoss = function(pos) {
	console.log('stop loss activated for position '+pos.id+' on '+pos.market);

	sellPosition(pos, pos.stop_loss*0.98);
}

takeProfit = function(pos) {
	console.log('take profit activated for position '+pos.id+' on '+pos.market);

	sellPosition(pos, pos.take_profit*0.98);
}

loadJson = function() {
	var content = fs.readFileSync("positions.json", "utf8");
	if(Object.keys(content).length === 0) {

	}
	else {
		markets = JSON.parse(content);
	}
}

saveJson = function(callback) {
	marketsStringified = JSON.stringify(markets);
	fs.writeFile("positions.json", marketsStringified, 'utf8', function(err) {
		if(err) {
			return console.log(err);
		}

		console.log("\nfile positions.json saved");
		callback();
	});
}

marketsToArray = function() {
	var arr = [];
	for(market in markets) {
		arr = arr.concat(markets[market]);

	}
	return arr;
}

startServer = function() {
	loadJson();
	addNewPosition('BTC-NEO', 10, 0.00045000);
	setInterval(scan, 1000);
}

startServer();

process.on( 'SIGINT', function() {
	saveJson(function() {
		console.log("stopping bottrex");
		process.exit( );
	});

});


module.exports = router;
