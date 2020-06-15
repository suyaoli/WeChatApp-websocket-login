
VERSION:=$(shell git symbolic-ref HEAD 2>/dev/null | cut -d"/" -f 3)

build:
	docker build . -t ws-login:1.0.0
tag:
	docker tag ws-login:1.0.0 harbor.duiduibang.com/ddb/ws-login:1.0.0

push:
	docker push harbor.duiduibang.com/ddb/ws-login:1.0.0