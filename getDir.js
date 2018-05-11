// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

module.exports = function(etcd, dir, callback) {
  etcd.get(dir, { recursive: true }, function(err, data) {
    if (err) {
      return callback(err);
    }

    function flatten(data, arr) {
      if (data.node) {
        flatten(data.node, arr);
      } else if (data.nodes){
        data.nodes.forEach(function(node) {
          flatten(node, arr);
        });
      } else if (data.value) {
        arr.push(JSON.parse(data.value));
      }
    }
    
    var ret = [];
    flatten(data, ret);
    return callback(null, ret);
  });
}
