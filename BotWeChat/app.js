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
var _ = require("underscore");
// var WebSocket = require('ws');

//for direct line
var secret = 'JmQLHOoxqeg.cwA.UqE.ZeXqmfJ5ncjzD9ZcoOe4tvOW7VDhVHZCMjfEEyZsNDo';
var _tokenObject;
var _conversationWss;
var _watermark = 0;

//create express eneity
var app = express();

//setting logger
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: './log/bot-wechat-0302.log' })
  ]
});

//wechat config
var config = {
  token: 'weixin',
  appid: 'wx1434eed5268660c4',
  encodingAESKey: 'ZEtViedarf49EUOCDeu45pqhkZhKPFBjSHI2DynP4vq',
  checkSignature: true // 可选，默认为true。由于微信公众平台接口调试工具在明文模式下不发送签名，所以如要使用该测试工具，请将其设置为false 
};

//create wechat-api entity
var api = new wechatAPI(config.appid, '30a5f51682755652e6e02879757a0fb1');

// var menu = {
//   "button": [
//     {
//       "type": "click",
//       "name": "WeChat Bot",
//       "key": "V1001_TODAY_MUSIC"
//     },
//     {
//       "name": "BotFramework",
//       "sub_button": [
//         {
//           "type": "view",
//           "name": "botframework",
//           "url": "https://dev.botframework.com/"
//         },
//         {
//           "type": "click",
//           "name": "赞一下我们",
//           "key": "V1001_GOOD"
//         }, {
//           "name": "发送位置",
//           "type": "location_select",
//           "key": "rselfmenu_2_0"
//         },]
//     }]
// };

// //remove menu
// api.removeMenu(function (err, result) {
//   if (err) {
//     logger.log('error', err);
//   }
//   logger.log('info', 'remove menu success');
// });

// //create menu
// api.createMenu(menu, function (err, result) {
//   if (err) {
//     logger.log('error', err);
//   }
//   logger.log('info', 'create menu success');
// });

//=========================================================================================================
//get token and create Conversation
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

    //maybe need refresh token here
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


//get message to message
function getmessagefrombotframework(senduserid, tokenobject, sendmsgid, sendwatermark) {
  // console.log('watermark:' + _watermark);
  // console.log('token :' + tokenobject.token);
  // console.log('Conversation :' + tokenobject.conversationId);
  // console.log('reply message id:' + sendmsgid);

  client.getMessage(tokenobject, sendwatermark).subscribe(
    (result) => {
      // console.log(result);

      _watermark = result.watermark;
      var getResponseMessages = _.where(result.activities, { replyToId: sendmsgid });

      if (getResponseMessages) {
        // For(var getResponseMessageItem in getResponseMessages){
        getResponseMessages.forEach(function (getResponseMessageItem) {

          //get message item
          wechatSendMessage(senduserid, getResponseMessageItem.text);

          //process attachment
          if (getResponseMessageItem.attachments) {
            // For(var getResponseMessageAttachmentItem in getResponseMessageItem.attachments)
            getResponseMessageItem.attachments.forEach(function (getResponseMessageAttachmentItem) {
              if (getResponseMessageAttachmentItem.contentType == 'application/vnd.microsoft.card.thumbnail' || getResponseMessageAttachmentItem.contentType == 'application/vnd.microsoft.card.hero')
                wechatSendMessage(senduserid, getResponseMessageAttachmentItem.content.title + '\r' + getResponseMessageAttachmentItem.content.subtitle + '\r' + getResponseMessageAttachmentItem.content.text + '\r' + getResponseMessageAttachmentItem.content.images[0].url);
            });
          }
        });
      }
    },
    (err) => console.log(err),
    () => console.log("get message complete---------------------------------")
  )
}

//wechat send message
function wechatSendMessage(sendUserId, message) {
  api.sendText(sendUserId, message, function (err, result) {
    if (err) {
      logger.log('error', err);
    }
    // console.log('info', 'reply message success');
  });
}

//this can get message from WeChat server, and can send message to wechat client
//此处监控的是URL的wechat，那么在配置微信的URL时，也需要在主机URL地址后面加入wechat这样才可以获取到数据
app.use(express.query());
app.use('/wechat', wechat(config, wechat.text(function (message, req, res, next) {
  //------------------------------------------------------------------------
  //get message from wechat client
  var message = req.weixin;
  logger.log("info", message);

  //=========================================================================================================
  var touserid = message.FromUserName;
  //send message entity
  var messageBody = {
    "type": "message",
    "from": {
      "id": message.FromUserName,
      "FromUserName": 'WeChatUser'
    },
    "text": message.Content
  };

  //send to message
  client.sendMessage(_tokenObject, messageBody).subscribe(
    (data) => {
      var sendMessageid = data.id;
      setTimeout(function () {
        getmessagefrombotframework(touserid, _tokenObject, sendMessageid, _watermark)
      }, 10000);
    },
    (err) => logger.log('error', err),
    () => {
      console.log("send Message to bot botframework completed");
    }
  );

  //response for wechat client
  res.reply('message sent successfully, waiting for response');

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
