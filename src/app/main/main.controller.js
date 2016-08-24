export class MainController {
	constructor($scope, $http, $timeout) {
		'ngInject';

		this.appendScripts();
		this.hostName = 'http://localhost:9200';
		this.indexName = 'demo';
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
			}
		];
		$scope.engine = $scope.engines[0];
		$scope.data = [];
		$scope.size = 10;

		$scope.search = () => this.search();

		$scope.channelOpen = function () {
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
		let url = `${this.hostName}/${this.indexName}/contact/_search`;
		this.$http.post(url, {
			query: {
				match: {
					"_all": this.getQuery()
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

	initRTCP() {
		var channel = window.channel = new window.DataChannel();
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
		if (data.reset) {
			return this.$scope.data = null;
		}
		this.$scope.data = data;
		console.info(data);
	}

	appendScripts() {
		let url = 'http://cdn.webrtc-experiment.com/DataChannel.js';
		var script = document.createElement("script");
		script.type = "text/javascript";
		angular.element("head").append(script);
		script.onload = () => this.initRTCP();
		script.src = url;
	}
}

