var EtherDream = require('./etherdream.js').EtherDream;

console.log('Waiting for DAC\'s...');

EtherDream.find(function(all) {
	if (all.length > 0) {
		console.log('Got list of etherdreams:', all);
	} else {
		console.log('No DAC\'s found.');
	}
});
