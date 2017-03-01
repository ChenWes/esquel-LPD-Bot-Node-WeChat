var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var winston = require('winston');
var wechat = require('wechat');
var wechatAPI = require('wechat-api');
var client = require('./directline-api-v3');
var WebSocket = require('ws');



//for direct line
var secret = 'JmQLHOoxqeg.cwA.UqE.ZeXqmfJ5ncjzD9ZcoOe4tvOW7VDhVHZCMjfEEyZsNDo';
var _tokenObject;
var _conversationWss;

var app = express();

//setting logger
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: './log/bot-wechat.log' })
  ]
});

//wechat config
var config = {
  token: 'weixin',
  appid: 'wxf6d0ac7f84dc22fb',
  encodingAESKey: 'ZEtViedarf49EUOCDeu45pqhkZhKPFBjSHI2DynP4vq',
  checkSignature: true // 可选，默认为true。由于微信公众平台接口调试工具在明文模式下不发送签名，所以如要使用该测试工具，请将其设置为false 
};

// var api = new wechatAPI(config.appid, config.encodingAESKey);
// var menu = {
//  "button":[
//    {
//      "type":"click",
//      "name":"今日歌曲",
//      "key":"V1001_TODAY_MUSIC"
//    },
//    {
//      "name":"菜单",
//      "sub_button":[
//        {
//          "type":"view",
//          "name":"搜索",
//          "url":"http://www.soso.com/"
//        },
//        {
//          "type":"click",
//          "name":"赞一下我们",
//          "key":"V1001_GOOD"
//        }]
//      }]   
// };
// api.createMenu(menu, function(result){
//   console.log('menu success');
// });

//=========================================================================================================
client.getTokenObject(secret).subscribe(
  (tokenObject) => {
    _tokenObject = tokenObject;
    logger.log('info', _tokenObject);

    client.initConversationStream(_tokenObject).subscribe(
      (message) => {
        _conversationWss = message;
        logger.log('info', _conversationWss);
      },
      (err) => console.log(err),
      () => console.log("Conversation complete---------------------------------")
    )

  },
  (err) => console.log(err),
  () => console.log('Token complete---------------------------------')
)
//=========================================================================================================


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//this can get message from WeChat server, and can send message to wechat client
//此处监控的是URL的wechat，那么在配置微信的URL时，也需要在主机URL地址后面加入wechat这样才可以获取到数据
app.use(express.query());
app.use('/wechat', wechat(config, wechat.text(function (message, req, res, next) {
  //------------------------------------------------------------------------
  var message = req.weixin;
  logger.log("info", message);

  res.transfer2CustomerService()
  //=========================================================================================================
  var messageBody = {
    "type": "message",
    "from": {
      "id": message.FromUserName,
      "FromUserName": 'WeChatUser'
    },
    "text": message.Content
  };

  client.sendMessage(_tokenObject, messageBody).subscribe(
    (data) => {

      var ws = new WebSocket(_conversationWss);
      ws.on('message', function (retsult, flags) {
        logger.log('info', retsult);

        // if (JSON.parse(retsult).activities[0].from.id !== message.FromUserName) {
        //   res.reply(JSON.parse(retsult).activities[0].text);
        // }
      });
      ws.on('close', function close() {
        //observer.complete();
        console.log("get Message complete");
      });

    },
    (err) => logger.log('error', err),
    () => {
      console.log("send Message complete");
    }
  );  

  res.reply('Message Process Completed.');

  //=========================================================================================================  
}).image(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('功能开发中');
}).voice(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('功能开发中');
}).video(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('功能开发中');
}).location(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('功能开发中');
}).link(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('功能开发中');
}).event(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('感谢你的关注，你也可以在github中查看，https://github.com/ChenWes/esquel-LPD-Bot-Node-WeChat');
}).device_text(function (message, req, res, next) {
  var message = req.weixin;
  logger.log("info", message);

  res.reply('功能开发中');
}).device_event(function (message, req, res, next) {
  if (message.Event === 'subscribe' || message.Event === 'unsubscribe') {
    var message = req.weixin;
    logger.log("info", message);
    
    res.reply("功能开发中");
  } else {
    var message = req.weixin;
    logger.log("info", message);
    
    res.reply('功能开发中');
  }
})));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var title = 'esquel';
  var err = new Error(':) Page Not Found');
  err.status = 404;

  logger.log('error', "Req.url:" + req.url + "    :) Page Not Found");
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
