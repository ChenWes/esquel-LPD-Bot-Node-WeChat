//基于 npm directline-api-v3做出的修改
//https://www.npmjs.com/package/directline-api-v3
//https://github.com/aravindkarnam/directline-api-v3

var request = require('request');
var Rx = require('rxjs/Rx');
// var WebSocket = require('ws');

function BotConnect() {
    this.baseUrl = 'http://directline.botframework.com/v3/directline/';
}

//获取基础Url
BotConnect.prototype.getBaseUrl = function () {
    return this.baseUrl;
}

//获取Token
BotConnect.prototype.getTokenObject = (secret) => {
    return Rx.Observable.create(observer => {
        request({
            method: 'POST',
            url: 'https://directline.botframework.com/v3/directline/tokens/generate',
            headers: {
                'Authorization': 'Bearer ' + secret
            }
        }, function (err, response, body) {
            if (err) {
                observer.error(err);
                observer.complete();
            }
            if (response.statusCode === 200) {
                observer.next(JSON.parse(body));
                observer.complete();
            }
            else {
                observer.error(response.statusCode + " error ");
                observer.complete();
            }
        })

    })
}

//刷新Token
BotConnect.prototype.refTokenObject = (TokenObject) => {
    return Rx.Observable.create(observer => {
        request({
            method: 'POST',
            url: 'https://directline.botframework.com/v3/directline/tokens/refresh',
            headers: {
                'Authorization': 'Bearer ' + TokenObject.token
            }
        }, function (err, response, body) {
            if (err) {
                observer.error(err);
                observer.complete();
            }
            if (response.statusCode === 200) {
                observer.next(JSON.parse(body));
                observer.complete();
            }
            else {
                observer.error(response.statusCode + " error ");
                observer.complete();
            }
        })

    })
}

//生成Conversation
BotConnect.prototype.initConversationStream = (TokenObject) => {
    return Rx.Observable.create(observer => {
        request({
            method: 'POST',
            url: 'https://directline.botframework.com/v3/directline/conversations',
            headers: {
                'Authorization': 'Bearer ' + TokenObject.token
            }
        }, function (err, response, body) {
            if (err) {
                observer.error(err);
                observer.complete();
            }
            if (response.statusCode === 200 || 201) {
                observer.next(JSON.parse(body));
                observer.complete();
            }
            else {
                observer.error(response.statusCode + " error ");
                observer.complete();
            }
        })

    })
}

//发送消息
BotConnect.prototype.sendMessage = (TokenObject, body) => {
    return Rx.Observable.create(observer => {
        request({
            method: 'POST',
            url: "https://directline.botframework.com/v3/directline/conversations/" + TokenObject.conversationId + "/activities",
            headers: {
                'Authorization': 'Bearer ' + TokenObject.token
            },
            json: true,
            body: body
        }, function (err, response, body) {
            if (err) {
                observer.error(err);
                observer.complete();
            }
            if (response.statusCode === 200 || 201 || response.statusCode === 403) {
                observer.next(body);
                observer.complete();
            }
            else {
                observer.error(response.statusCode + " error ");
                observer.complete();
            }
        })

    })
}

//接收消息
BotConnect.prototype.getMessage = (TokenObject, watermark) => {
    var watermarkStr = watermark ? 'watermark=' + watermark : '';
    // console.log('get message to function watermark:' + watermarkStr);

    return Rx.Observable.create(observer => {
        request({
            method: 'GET',
            url: "https://directline.botframework.com/v3/directline/conversations/" + TokenObject.conversationId + "/activities" + '?' + watermarkStr,
            headers: {
                'Authorization': 'Bearer ' + TokenObject.token
            },
            json: true
        }, function (err, response, body) {
            if (err) {
                observer.error(err);
                observer.complete();
            }
            if (response.statusCode === 200) {
                observer.next(body);
                observer.complete();
            }
            else {
                observer.error(response.statusCode + " error ");
                observer.complete();
            }
        })

    })
}


//结束converstaion
BotConnect.prototype.endConversation = (TokenObject) => {
    return Rx.Observable.create(observer => {
        request({
            method: 'POST',
            url: "https://directline.botframework.com/v3/directline/conversations/" + TokenObject.conversationId + "/activities",
            headers: {
                'Authorization': 'Bearer ' + TokenObject.token
            },
            json: true,
            body: {
                "type": "endOfConversation",
                "from": {
                    "id": TokenObject.conversationId,
                }
            }
        }, function (err, response, body) {
            if (err) {
                observer.error(err);
                observer.complete();
            }
            if (response.statusCode === 200 || 201) {
                observer.next(body);
                observer.complete();
            }
            else {
                observer.error(response.statusCode + " error ");
                observer.complete();
            }
        })

    })
}
module.exports = new BotConnect();