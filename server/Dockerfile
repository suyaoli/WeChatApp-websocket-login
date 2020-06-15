FROM node:11

ENV TZ "Asia/Shanghai"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone


ADD ./ /home/node/app/


#进入到app目录下面，类似cd
WORKDIR /home/node/app

RUN rm -rf logs
RUN rm -rf node_modules

#安装依赖
RUN npm install
#对外暴露的端口
EXPOSE 8088
#程序启动脚本
CMD ["node","server.js"]