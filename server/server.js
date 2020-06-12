var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http');
var server = http.Server(app);
var websocket = require('ws');
var QRCode = require('qrcode');
var ini = require('ini');
var log4js = require("log4js");
var yargs = require('yargs');
var path = require("path");

var argv = yargs.reset().option("c", {
    alias: "config_file_path",
    demand: true,
    default: path.resolve(''),
    description: "config file path"
  }).help("h").alias("h", "help").argv;
  
  var Info = ini.parse(fs.readFileSync(argv.c + "/config.ini", "UTF-8"));
  
  // log
  log4js.configure({
    appenders: {
      out: { type: 'stdout' },
      day: {
        type: 'dateFile', filename: argv.c + "/logs/date", alwaysIncludePattern: true, pattern: "-yyyy-MM-dd.log"
      }
    },
    categories: {
      default: { appenders: ['out', 'day'], level: Info.log },
    }
  });
  
var Log = log4js.getLogger();
  
// 小程序wx.login需要用到的参数
var appid =Info.appid;
var secret = Info.secret;
var grant_type = "authorization_code";

var wss = new websocket.Server({
    server
});

// 模拟get请求
var get_request = (url, params) => {
    var request = require('request');
    var options = {
        method: 'GET',
        url: url,
        headers: {
            'Content-type': 'text/html; charset=utf-8'
        },
        qs: params
    }
    return new Promise((resolve, reject) => {
        request(options, (err, response, body) => {
            if (err) reject(err);
            resolve(typeof body == 'object' ? body : JSON.parse(body));
        })
    })

}

var socket_type = {
    '/?admin': 'admin',
    '/?login': 'login'
}
// 创建websocket服务
wss.on('connection', (ws, req) => {
    // 输出当前连接数
    Log.info('connected: ', wss.clients.size)
    // socket客户端自动创建的唯一标识,也可以在客户端自己创建唯一标识发送到服务端
    // 自己创建的好处在于可以直接刷新,自动创建想刷新只有在客户端重启socket服务
    // 把req的key存在当前请求的ws上方便等下判断
    ws.key = req.headers['sec-websocket-key'];
    // req.url: 判断socket连接,例如 当前小程序连接服务器地址为ws://192.168.0.100:8088?admin
    // 可区分小程序socket和登录socket 方便做不同的操作
    ws.type = socket_type[req.url];
    Log.info('type: ', ws.type);
    if (ws.type != 'admin') {
        // 不是小程序连接,生成二维码返回
        QRCode.toDataURL(ws.key, function (err, img_url) {
            ws.send(JSON.stringify({
                code: 200,
                success: true,
                img_url: img_url
            }));
        });
    }

    // 目前onmessage只有小程序发送请求,小程序扫码后识别出key值生成的二维码后发送给服务器,服务器判断是否有在线的ws.key相匹配
    // 匹配则发送信息'登录成功'
    ws.on('message', (key) => {
        // 记录key匹配的在线客户端
        var number = 0;
        wss.clients.forEach(client => {
            if (client !== ws && client.key === key) {
                number++;
                client.send(JSON.stringify({
                    code: 200,
                    success: true,
                    message: '登录成功'
                }))
            }
        });
        Log.info(number)
        //number为0表示不存在当前key匹配的客户端,给小程序发送key无效的信息
        if (!number) {
            ws.send('key值无效,登录失败.')
        } else {
            ws.send('登录成功.')
        }
    })

    ws.on('close', _ => {
        // 有客户端关闭连接,输出目前连接数
        Log.info('someone closed connection, connected:', wss.clients.size)
    })

    ws.on('error',_=>{

    })
});

// 小程序wx.login需要用到:
// https://mp.weixin.qq.com/debug/wxadoc/dev/api/api-login.html#wxloginobject
app.get('/api/wx/jsoncode2session', (req, res) => {
    var js_code = req.query.js_code;
    var params = {
        appid,
        secret,
        js_code,
        grant_type
    };
    get_request('https://api.weixin.qq.com/sns/jscode2session', params).then(result => {
        res.json(result);
    }, err => {
        res.end(err);
    });
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});


server.listen(Info.port, '0.0.0.0', function () {
    Log.info('listening on *:'+Info.port);
});