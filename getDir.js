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
