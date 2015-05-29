var Etcd = require('node-etcd');
var StatsClient = require('stats-client');
var getDir = require('./getDir');

var DIRS = {
  Peers: '/router/zetta',
  Targets: '/services/zetta',
  Version: '/zetta/version'
};

var hosts = ['localhost:4001'];
if (process.env.ETCD_PEER_HOSTS) {
  hosts = process.env.ETCD_PEER_HOSTS.split(',');
}

var statsClient = new StatsClient('localhost:8125');
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





