//[
// Copyright (c) 2011, Richard Miller-Smith & David Hammond.
// All rights reserved. Redistribution and use in source and binary forms, 
// with or without modification, are permitted provided that the following 
// conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of the ignite.js project, nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//]

/* ignite.js Plugin 'map'
 * 
 * For each entry of an array kick off an asynchronous function and 
 * build a new array with the returned values.
 * 
 * Parameters:
 * 
 *    map {String|Function} Async function or, if a string, the name
 *                          of the asynchronous function (which can be
 *                          found in the JSFactory imports). Using a string
 *                          helps create better diagrams for very little
 *                          overhead.
 *    over {Array|Function} Allows the array which should be iterated over
 *                          to be set. 
 *    argfn {Function}      A function, called for each element of the array,
 *                          which should return an array of arguments to pass
 *                          to the async function. This function is passed
 *                          the current item on the array and its position.
 *                          If not set, then the async function is called with
 *                          a single argument - the current object on the array.
 *    mapper {Function}     Called when each async function returns (with no
 *                          error) and allows the output value to be set. 
 *                          Defaults to the first non-error argument.
 *    par {Number}          Set the maximum number of parallel asynchronous
 *                          calls.
 *     
 * Events:
 * 
 *    "map.done" [outarray, inarray, errarray]
 *                          Map is complete. Returns the new mapped array, then
 *                          the original array and finally an error array.
 *                          
 */

var util = require('util'),
    pluginUtils = require('../../../utils/pluginUtils') ;

function MapPlugin (piApi, name) {
  piApi.registerStatePI(name, {
   initState: function (statename, state) {
     if (typeof state[name] !== "object") {
       pluginUtils.convertToObj(this, statename, state, name) ;
     }
     
     pluginUtils.strtofn(this, statename, state, name);
   },
   state: {
     entry: function () {
       var state = this.state, piObj = state[name], _priv ;
       _priv = pluginUtils.arrayEachEmitter.call(this, name, arguments[0]) ;
       _priv.outarray = [] ;
       _priv.errarray = [] ;
       _priv.outarray.length = _priv.array.length ;
       _priv.mapper = state.mapper ;
       piObj[this.privName] = _priv ;
       
       _priv.ee.launch() ;
     },
     exit: function () {
       delete this.state[name][this.privName] ;
     },
     actions: {
       "_each.newListener": "@ignore",
       "_each._fire": "@ignore",
       "_each._done": function (pos, fnargs, err, data) {
         var piObj = this.state[name] ;
         var _priv = this.state[name][this.privName] ;

         if (err) {
           _priv.errarray[pos] = err ;
         } else {
           var args = Array.prototype.slice.call(arguments, 3) ;
           args[args.length] = fnargs ;
           if (piObj.iterator) { 
             _priv.outarray[pos] = piObj.iterator.apply(this, args) ;
           } else {
             _priv.outarray[pos] = data ;
           }
           if (this.state[name].replace) {
             _priv.array[pos] = fnargs[0] ;
           }
         }
       },
       "_each._alldone": function (length) {
         var _priv = this.state[name][this.privName] ;
         var evt = [name+".done", _priv.outarray, _priv.array, _priv.errarray] ;
         this._inject(null, evt) ;
       }
     }
   },
   graph: pluginUtils.EachEmitter.graph,
   graphfns: pluginUtils.EachEmitter.stdFnList
  });
} ;

module.exports = MapPlugin ;
