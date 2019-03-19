# NodeJS shared memory


## Master

The Master

* creates the worker processes (#CPU count)
* listen to worker processes end and restart those one immediately

The Master provides

* a sequential access to the log file for th ecluster through the Observable IPC Event Bus 
* a sequential access to a resource (like DB, ...) through the Observable IPC Event Bus 
* a cache that can be accessed by workers through Observable IPC Event Bus 

## Worker

The Worker

* is an express web server application
* all workers serving HTTP request on the same port (3030)

The worker provides
* `/ping` aswer with a ping message
  
* `/public` returns a static resource (Html, css) from a '/public' folder

* `/write` sends a doc event to the Master to write the document to the shared data store 

* `/web-hook` can only be called one at a time. Thna inside the express middleware, the worker
    * adds the url in the master's shared cache (by using the IPC observable IPC Event)
    * process the web-hook
    * remove the entry from the cache
  * if another call to `/web-hook` is realized, the webHook is not called
  
## TODO
  
  * check if error are correctly handled in all teh situation
  * Add timeout on the WebHook (see startTime in cache)

