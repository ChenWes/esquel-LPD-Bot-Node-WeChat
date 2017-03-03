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
var schedule = require('node-schedule');

//for direct line
var secret = 'JmQLHOoxqeg.cwA.UqE.ZeXqmfJ5ncjzD9ZcoOe4tvOW7VDhVHZCMjfEEyZsNDo';
var _tokenObject;
var _conversationWss;
var _watermark = 0;

//for schedule
var _refershSchedule;

//create express eneity
var app = express();

//setting logger
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: './log/bot-wechat-0303.log' })
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
//get token 
function getTokenAndGetConverstation() {
  client.getTokenObject(secret).subscribe(
    (tokenObject) => {
      _tokenObject = tokenObject;
      logger.log('info', _tokenObject);

      //create Conversation
      client.initConversationStream(_tokenObject).subscribe(
        (message) => {
          _conversationWss = message;
          logger.log('info', _conversationWss);


          //refresh token,every 15 min refreshToken
          var rule = new schedule.RecurrenceRule();
          rule.minute = [0, 15, 30, 45];
          _refershSchedule = schedule.scheduleJob(rule, function () {
            console.log('===>' + new Date());
            refreshToken();
          });

        },
        (err) => console.log(err),
        () => console.log("1.2:get conversation successfully")
      )

    },
    (err) => console.log(err),
    () => console.log('1.1:get token successfully')
  )
}
getTokenAndGetConverstation();

//=========================================================================================================
function refreshToken() {
  console.log('------------------------refreshToken-----------------------------' + new Date());
  client.refTokenObject(_tokenObject).subscribe(
    (tokenObject) => {
      _tokenObject = tokenObject;
      logger.log('info', _tokenObject);
    },
    (err) => {
      console.log(err);

      //cancel schedule
      _refershSchedule.cancel();

    },
    () => console.log('1.3:refresh token successfully')
  )
}


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//send message to bot framework
function sendMessageToBotframework(_tokenObject, messageBody, touserid) {
  client.sendMessage(_tokenObject, messageBody).subscribe(
    (data) => {
      var sendMessageid = data.id;

      //time out function get message from botframework
      setTimeout(function () {
        getmessagefrombotframework(touserid, _tokenObject, sendMessageid, _watermark)
      }, 10000);
    },
    (err) => {
      logger.log('error', err);
    },
    () => {
      console.log("2.2:send message to bot botframework successfully");
    }
  );
}

//get message from bot framework function
function getmessagefrombotframework(senduserid, tokenobject, sendmsgid, sendwatermark) {
  client.getMessage(tokenobject, sendwatermark).subscribe(
    (result) => {

      _watermark = result.watermark;

      //filter activities
      var getResponseMessages = _.where(result.activities, { replyToId: sendmsgid });
      //send message to wechat client
      sendMessageToClient(senduserid, getResponseMessages);

      //if send message max , then restart the converstation
      var arr = sendmsgid.split('|');
      console.log(arr[1]);
      if (arr[1] == '9999999') {
        getTokenAndGetConverstation();
      }

    },
    (err) => {
      logger.log('error', err);
    },
    () => console.log("3.1:get message from botframework successfully")
  )
}

//send to message to wechat client
function sendMessageToClient(senduserid, getResponseMessages) {
  if (getResponseMessages) {

    //forEach message
    getResponseMessages.forEach(function (getResponseMessageItem) {

      //process message from botframework
      api.sendText(senduserid, getResponseMessageItem.text, function (err, result) {
        if (err) {
          logger.log('error', err);
        }
      });


      //process attachment
      if (getResponseMessageItem.attachments) {
        getResponseMessageItem.attachments.forEach(function (getResponseMessageAttachmentItem) {
          if (getResponseMessageAttachmentItem.contentType == 'application/vnd.microsoft.card.thumbnail' || getResponseMessageAttachmentItem.contentType == 'application/vnd.microsoft.card.hero')

            //-------------upload media
            api.uploadMedia(getResponseMessageAttachmentItem.content.images[0].url, 'image', function (err, result) {
              // console.log('start upload image' + result);
              if (err) {
                logger.log('error', err);
              }
              else {
                //-------------send image
                api.sendImage(senduserid, result.media_id, function (err, result) {
                  if (err) {
                    logger.log('error', err);
                  }
                });
                //-------------
              }
            });
          //-------------


          api.sendText(senduserid, getResponseMessageAttachmentItem.content.title + '\r' + getResponseMessageAttachmentItem.content.subtitle + '\r' + getResponseMessageAttachmentItem.content.text, function (err, result) {
            if (err) {
              logger.log('error', err);
            }
          });

        });
      }
    });


  }
  else {
    //no message get from botframework
    api.sendText(senduserid, 'time out , but bot framework no response', function (err, result) {
    });
  }
}

//this can get message from WeChat server, and can send message to wechat client
//此处监控的是URL的wechat，那么在配置微信的URL时，也需要在主机URL地址后面加入wechat这样才可以获取到数据
app.use(express.query());
app.use('/wechat', wechat(config, wechat.text(function (message, req, res, next) {
  //------------------------------------------------------------------------
  //get message from wechat client
  var message = req.weixin;
  logger.log("2.1:get message from wechat client", message);

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

  //send message to botframework
  sendMessageToBotframework(_tokenObject, messageBody, touserid);

  //response for wechat client
  res.reply('message send successfully, waiting for response');

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
