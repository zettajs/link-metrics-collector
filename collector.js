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

var Etcd = require('node-etcd');
var StatsClient = require('stats-client');
var getDir = require('./getDir');

var DIRS = {
  Peers: '/router/zetta',
  Targets: '/services/zetta',
  Version: '/zetta/version'
};

var hosts = process.env.COREOS_PRIVATE_IPV4 || 'localhost';

if (process.env.ETCD_PEER_HOSTS) {
  hosts = process.env.ETCD_PEER_HOSTS.split(',');
}

var usingTelegrafFormat = !!(process.env.INFLUXDB_HOST);
if (usingTelegrafFormat) {
  console.log('Using telgraf format.');
}

var statsClient = new StatsClient(process.env.STATSD_HOST || 'localhost:8125', {}, { telegraf: usingTelegrafFormat, prefix: 'link' });
var etcd = new Etcd(hosts);

gatherMetrics();
setInterval(gatherMetrics, process.env.INTERVAL || 10000);

function gatherMetrics() {
  etcd.get(DIRS.Version, function(err, data) {
    if (err) {
      console.error(err);
      return;
    }

    var version = JSON.parse(data.node.value).version;
    getDir(etcd, DIRS.Targets, function(err, targets) {
      if (err) {
        console.error(err);
        return;
      }
      
      getDir(etcd, DIRS.Peers, function(err, peers) {
        if (err) {
          console.error(err);
          return;
        }

        var unallocatedTargets = []; // [target]
        var allocatedTargets = {}; // <tenantId>: [target]
        var peersConnected = {}; // <targetUrl>: [peers]

        targets.forEach(function(target) {
          if (!target.tenantId && target.version === version) {
            unallocatedTargets.push(target);
            return;
          } else if (target.version === version) {
            if (!allocatedTargets[target.tenantId]) {
              allocatedTargets[target.tenantId] = [];
            }
            allocatedTargets[target.tenantId].push(target);
          }
        });

        peers.forEach(function(peer) {
          if (!peersConnected[peer.url]) {
            peersConnected[peer.url] = [];
          }
          peersConnected[peer.url].push(peer);
        });

        
        statsClient.gauge('targets.unallocated', unallocatedTargets.length);
        Object.keys(allocatedTargets).forEach(function(tenant) {
          statsClient.gauge('targets.allocated', allocatedTargets[tenant].length, { tenant: tenant });
        });

        Object.keys(peersConnected).forEach(function(url) {
          statsClient.gauge('peers.connected', peersConnected[url].length, { targetHost: url, tenant: peersConnected[url][0].tenantId });
        });
        
      });
    });
  });
}





