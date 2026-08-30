/* Linux Hexodo Server boilerplate

  @user: kurku
  @mail: sandovin@mail.ru
  @date: Tue Aug 18 01:10:34 AM MSK 2026 

  All rights reserved. */

#include <stdint.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/mman.h>
#include <stddef.h>
#include <unistd.h>
#include <stdio.h>
#include <poll.h>
#include <string.h>
#include <arpa/inet.h>
#include <stdbool.h>
#include <stdlib.h>

#define TIMEOUT 1000

#define MAX_CONNECTIONS 1000

#define PAGE_SIZE __page_size
uint64_t __page_size;

struct arena {
  uint64_t space_reserved;
  uint64_t space_commited;
  uint64_t using_actually;

  uint8_t* memory_begin;
  uint8_t* memory_cursor;
};

uint64_t page_alligned(uint64_t space) {
   uint64_t page_size  = PAGE_SIZE;
   uint64_t round_mask = page_size - 1;
   space += round_mask;
   space &= round_mask;
   return space;
}

void* arena_push(struct arena* restrict arena, uint64_t block_size) {
  void* cursor = arena->memory_cursor;

  uint64_t used_size = arena->using_actually;
  uint64_t would_size;

  int32_t cannot_push = false;
  cannot_push = cannot_push || __builtin_add_overflow(used_size, block_size, &would_size);
  cannot_push = cannot_push || would_size > arena->space_reserved;

  if (cannot_push) {
    // in case we messed something up
    abort();
  }

  for (uint64_t i = 0; i < block_size; i += 1) {
    arena->memory_cursor[i] = 0;
  }

  arena->memory_cursor  = arena->memory_cursor + block_size;
  arena->using_actually = would_size;
  arena->space_commited = page_alligned(would_size);

  return cursor;
}

void arena_pop(struct arena* restrict arena, uint64_t block_size) {
  void* cursor = arena->memory_cursor;

  uint64_t used_size = arena->using_actually;
  uint64_t commited  = arena->space_commited;

  if (block_size > used_size) {
    // we cannot delete more than there exists anyway
    // so we messed something up
    abort();
  }

  uint64_t would_size   = used_size - block_size;
  uint8_t* would_cursor = arena->memory_cursor - block_size;
  uint64_t would_commit = page_alligned(would_size);

  uint64_t freed_bytes = commited - would_commit;
  void*    freed_from  = arena->memory_begin + would_commit;

  arena->using_actually = would_size;
  arena->memory_cursor  = would_cursor;
  arena->space_commited = would_commit;
  
  if (freed_bytes) {
    madvise(freed_from, freed_bytes, MADV_DONTNEED);
  }
}

struct serv {
  int events_count;
  int events_max;
  int fd_entrance;
  int connections_queued;
  struct pollfd events[];
};

void serv_push_fd(struct serv* serv, int fd) {
  if (serv->events_count < serv->events_max) {
    serv->events[serv->events_count].fd     = fd;
    serv->events[serv->events_count].events = POLLIN;
    serv->events_count += 1;
  } else {
    // TODO(ivan): log that we have no place
    abort();
  }
}

void serv_update_connections_queued(struct serv *s) {
  struct tcp_info info;
  void      *i_info  = (void*)& info;
  socklen_t  s_info  = sizeof   info;
  
  int r_getsockopt = -1;
  r_getsockopt = getsockopt(s->fd_entrance, IPPROTO_TCP, TCP_INFO, i_info, &s_info);
  s->connections_queued = info.tcpi_unacked;
}

// TODO(ivan): write test code to run websockets
//             I probably need a library to do that
//             but it may be easier to learn about how it works anyway 
//             so let's try 
//
int main(int argc, char** argv) {

  __page_size = sysconf(_SC_PAGE_SIZE);

  void*  location    = NULL; // let the system decide
  size_t size        = PAGE_SIZE * 10; 
  int    permissions = PROT_READ | PROT_WRITE; // let me read, let me write
  int    type        = MAP_ANONYMOUS | MAP_PRIVATE; // just give me virtual memory
  int    fd          = -1; // there is no file backing
  int    offset      = 0;  // and there is no offset in file as well
  void* memory = mmap(location, size, permissions, type, fd, offset);

  if (memory != NULL) {

    int reserve_space = sizeof(struct serv) 
                      + sizeof(struct pollfd) * MAX_CONNECTIONS;
    memset(memory, 0, reserve_space);
    struct serv *serv = (struct serv*) memory;
    memory = memory + reserve_space;

    serv->events_max = MAX_CONNECTIONS + 1;

    // socket settings
    struct sockaddr_in server_address   = {0};
    int                queue_size       = 100;
    int                reuseaddr        = 1;

    int                fd_entrance      = -1;
    int                r_bind           = -1;
    int                r_listen         = -1;

    // TODO(ivan): port is obviously should come from env var
    //             and/or be parsed from argv
    server_address.sin_addr.s_addr = INADDR_ANY;
    server_address.sin_family      = AF_INET;
    server_address.sin_port        = htons(8088); 

    // bunch of generic interfaces boilerplate
    struct sockaddr *i_server_address = (void*)& server_address;
    socklen_t        s_server_address = sizeof   server_address;
    void            *i_reuseaddr      = (void*)& reuseaddr;
    socklen_t        s_reuseaddr      = sizeof   reuseaddr;

    fd_entrance = socket(AF_INET, SOCK_STREAM, 0);
    if (fd_entrance >= 0) {
      serv_push_fd(serv, fd_entrance);
      serv->fd_entrance = fd_entrance;
      setsockopt(fd_entrance, SOL_SOCKET, SO_REUSEADDR, i_reuseaddr, s_reuseaddr);
      r_bind = bind(fd_entrance, i_server_address, s_server_address);
      if (r_bind >= 0) {
        r_listen = listen(fd_entrance, queue_size);
        if (r_listen >= 0) {

          void *request_handle_start = memory;
          char *ip_string     = NULL;
          void *message_start = NULL;
          int   message_size  = 0;

          while (1) {
            serv_update_connections_queued(serv);
            
            int events_happened = poll(serv->events, serv->events_count, TIMEOUT);
            if (events_happened > 0) {

              int times = serv->events_count;
              struct pollfd* event = NULL;
              for (int i = 0; i < times; i++) { 
                event = &serv->events[i]; 
                if (event->fd == fd_entrance) {
                  if (event->revents & POLLIN) {

                    struct sockaddr_in  addr_new_connection   = {0};
                    struct sockaddr    *i_addr_new_connection = (void*)& addr_new_connection;
                    socklen_t           s_addr_new_connection = sizeof   addr_new_connection;

                    int fd_new_connection = accept(fd_entrance, i_addr_new_connection, &s_addr_new_connection);
                    serv_push_fd(serv, fd_new_connection);

                    // DONE(ivan): print ip of a connected guy here
                    // TODO(ivan): make an interface for arena
                    {
                      ip_string =  memory;
                      memory    += INET_ADDRSTRLEN;
                      struct in_addr *i_sin_addr = &addr_new_connection.sin_addr;
                      int             sin_port   = ntohs(addr_new_connection.sin_port);
                      inet_ntop(AF_INET, i_sin_addr, ip_string, INET_ADDRSTRLEN);
                      printf("Received connection %s:%d\n", ip_string, sin_port);
                    }
                    printf("queued: %d\n", serv->connections_queued);
                    fflush(stdout);
                    // RESEARCH(ivan): good we started receiving them
                    //                 but how do we close?
                  }
                } else {
                  // TODO(ivan): just print it back
                  // TODO(ivan): handle connection
                  if (event->revents & POLLIN) {
                    if (message_start == NULL) {
                      puts("MSG-BEGIN");
                      puts("++");
                      message_start = memory;
                    }

                    void* message_current = message_start + message_size;
                    int max_read_size = 1024;
                    int data_read = 0;

                    data_read = read(event->fd, message_current, max_read_size);
                    if (data_read == 0) {
                      puts("--");
                      puts("MSG-END");
                      
                      int r_close = close(event->fd);
                      if (r_close >= 0) {
                        puts("Connection closed");
                        // TODO(ivan): also remove the connection
                        // TODO(ivan): we probably want to get out so we need some round robin
                      } else {
                        // TODO(ivan): handle errors
                        abort();
                      }

                    } else {
                      write(STDOUT_FILENO, message_current, data_read);
                      message_size  += data_read;
                    }
                  }
                }
              }
            } else if (events_happened == -1) {
              // TODO(ivan): handle poll errors
              abort();
            }
          }
        } else {
          // TODO(ivan): handle listen errors
          abort();
        }
      } else {
        // TODO(ivan): handle socket errors
        abort();
      }
    } else {
      // TODO(ivan): handle it
      abort();
    }
  } else {
    // TODO(ivan): handle it
    abort();
  }
}
