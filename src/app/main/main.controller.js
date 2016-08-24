export class MainController {
	constructor($scope, $http, $timeout) {
		'ngInject';

		this.appendScripts();

		this.$scope = $scope;
		this.$http = $http;
		this.$timeout = $timeout;

		$scope.searchCount = null;
		$scope.searchTime = null;

		$scope.engines = [
			{
				id: 1,
				method: 'searchFromElastic',
				name: 'ElasticSearch'
			},
			/*{
				id: 2,
				method: 'searchFromSolr',
				name: 'Solr'
			}*/
		];
		$scope.engine = $scope.engines[0];
		$scope.data = [];
		$scope.size = 10;

		$scope.search = () => this.search();
		$scope.getHighlight = (value) => this.getHighlight(value);

		$scope.channelOpen = function() {
			window.channel.open();
		};
	}
	
	search() {
		let method = this.$scope.engine.method;
		if (!method || !this.$scope.q) {
			this.$scope.data = [];
			return;
		}
		this[method].call(this);
	}

	decorateElasticData(data) {
		let array = [];
		for (let key in data) {
			let item = data[key];
			array.push(item._source);
		}
		return array;
	}

	getQuery() {
		let q = this.$scope.q;
		if (/\*/.test(q)) {
			return q;
		}
		return this.$scope.isContain ? '*' + q + '*' : q;
	}

	searchFromElastic() {
		let self = this;
		let scope = this.$scope;
		let url = 'http://localhost:9200/demo/_search';
		this.$http.post(url, {
			query: {
				match : {
					"_all" : this.getQuery()
				}
			},
			size: scope.size
		}).then((res) => {
			let data = res.data;
			scope.searchTime = data.took;
			scope.searchCount = data.hits.total;
			scope.data = self.decorateElasticData(data.hits.hits);
			self.sendData(scope.data);
		});
	}

	searchFromSolr() {
		let scope = this.$scope;
		let url = `http://${location.hostname}:8983/solr/db/select?indent=on&wt=json`;
		let params = `&q=${this.getQuery()}&rows=${scope.size}`;
		this.$http.get(url + params)
			.then((res) => {
				let data = res.data;
				scope.searchTime = data.responseHeader.QTime;
				scope.searchCount = data.response.numFound;
				scope.data = data.response.docs;
			});
	}

	getHighlight(value) {
		value += "";
		var q = this.$scope.q.replace("\s{2,}", " ");
		if (/\*/.test(q)) {
			return value;
		}
		var words = q.split(" ");
		for (let index in words) {
			let word = words[index];
			if (this.$scope.isContain) {
				value = value.replace(new RegExp('(' + word + ')', 'gi'), '<b>$1</b>');
			} else {
				value = value.replace(new RegExp('([^a-z1-9])(' + word + ')([^a-z1-9])', 'gi'), '$1<b>$2</b>$3');
			}
		}
		return value;
	}

	initRTCP() {
		var channel = window.channel = new DataChannel();
		channel.onopen = function (userid) {
			channel.send(`connect is ${userid}`);
		};

		channel.onmessage = () => this.onMessage();

		channel.onleave = function (userid) {
			console.log(userid);
		};

		channel.connect('elasticsearch');
	}

	sendData(data) {
		window.channel.send(data);
	}

	onMessage(data) {
		this.$scope.data = data;
		console.info(data);
	}

	appendScripts() {
		let url = '//cdn.webrtc-experiment.com/DataChannel.js';
		var script = document.createElement("script");
		script.type = "text/javascript";
		angular.element("head").append(script);
		script.onload = () => this.initRTCP();
		script.src = url;
	}
}

