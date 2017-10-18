var express = require('express');
var router = express.Router();
var shortid = require('shortid');
var fs = require('fs');
var bittrex = require('node-bittrex-api');
bittrex.options({
	'apikey' : process.env.BITTREX_API_KEY,
	'apisecret' : process.env.BITTREX_API_SECRET,
});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

Position = function(market, buy_price) {
	this.id = shortid.generate();
	this.market = market;
	this.buy = buy_price;
	this.stop_loss = buy_price * 0.95;
	this.take_profit = buy_price * 1.10;
}

var markets = [];
var positionArr = [];
var tickerArr = [];

scan = function() {
	for(var market in markets) {

		if(markets[market] != []) {
			var posArr = markets[market];

			updateTicker(market, function(price) {
				for(var i=0; i<posArr.length; i++) {
					var pos = posArr[i];

					if(price >= pos.take_profit) {
						//Take Profit
					}
					else if(price <= pos.stop_loss) {
						//Stop Loss
					}
				}
			});
		}
	}
}

addNewPosition = function(market, buy_price) {
	var pos = new Position(market, buy_price);

	if(!markets[market])
		markets[market] = [];

	market[market].push(pos);
}

closePosition = function(market, id) {

}

stopLoss = function(market, id) {

}

takeProfit = function(market, id) {

}

loadJson = function() {
	markets = fs.readFileSync("/positions.json");
}

saveJson = function() {
	marketsStringified = JSON.stringify(markets);

	fs.writeFile("/positions.json", marketsStringified, 'utf8', function(err) {
		if(err) {
			return console.log(err);
		}

		console.log("file positions.json saved");
	});
}


module.exports = router;
