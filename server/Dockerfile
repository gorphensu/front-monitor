FROM node:12.14.0
RUN echo "-------------------- server环境配置 --------------------"
WORKDIR /server
COPY ./ .
VOLUME /var/log/nginx/logs /var/log/nginx/logs
RUN npm install -g cnpm --registry=https://registry.npm.taobao.org
RUN npm config set registry https://registry.npm.taobao.org
RUN npm install pm2 -g
RUN cnpm install
RUN cnpm run build
EXPOSE 3000
CMD ["/bin/bash","./bin/run.sh","run", "production"]
# docker build -t server_container .
# docker run -p 3000:3000 -v /var/log/nginx/logs:/var/log/nginx/logs -v /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime server_container
