CC=gcc
BASE_CFLAGS=-g3 -Wall -Wextra
TARGET=server
TARGET_DEBUG=server.debug

all: server

server: server.c
	$(CC) $(BASE_CFLAGS) -O2 server.c -o $(TARGET)
debug: server.c
	$(CC) $(BASE_CFLAGS) -O0 server.c -o $(TARGET_DEBUG)
