//Define a controller for layers
//Add root scope dependency
app.controller("layersCtrl", function($scope, $window, $http, markupService, api, layerService){

	//Define scope variables
	$scope.layers = [];
	$scope.index = 0;
	$scope.activeLayerIndex = 0;
	$scope.options = layerService.options;

	$scope.$on('layers', function(events, args){
		$scope.layers = args.layers;
		$scope.activeLayerIndex = args.activeLayerIndex;
	});

	$scope.$on('aperioLayers', function(events, args){
		$scope.layers = args;
		$scope.activeLayerIndex = 0;
	});

	$scope.$on('activeImageId', function(events, args){
		$scope.options.imageId = args;
		$scope.init();
	});

	/**
	 * 
	 */
	$scope.init = function(){
		$scope.clear();
		$scope.load();

		if($scope.layers.length == 0){
			$scope.add();
			$scope.setActiveLayer(0);
		}
	}

	/**
	 * Add new layer
	 * Add new layer and broadcast the scope layer variables
	.* to the root scope so it can be used by markup controller
	 */
	$scope.add = function(){
		var opt = angular.merge(
						angular.copy($scope.options), 
						{id: $scope.index, name: $scope.options.name, createdTime: new Date().toISOString()}
				);
		
		$scope.layers.push(opt);
		$scope.broadcastLayers();
		$scope.index++;
		$scope.options.name = $scope.index;
		//$scope.setActiveLayer($scope.index);
	};

	/**
	 * Remove layer
	 * @param {Number} index (layer index or ID)
	 */
	$scope.remove = function(index){
		var markups = $scope.layers[index].markups;
		for(var i in markups){
			markup = markups[i];
			var antIndex = markupService.getAnnotationIndex(markup.data.index);
			$window.annotationState.annotations.splice(antIndex, 1);
			markup.detach();
		}

		$scope.layers.splice(index, 1);
	};

	/**
	 * Update layer attributes
	 * @param {Number} index
	 * @param {Object} layer
	 */
	$scope.update = function(){
		$scope.layers[$scope.activeLayerIndex].name = $scope.activeLayer.name;
		$scope.layers[$scope.activeLayerIndex].description = $scope.activeLayer.description;
		
		var markups = $scope.layers[$scope.activeLayerIndex].markups;
		for(var index in markups){
			markup = markups[index];
			markup.element.style.borderColor = $scope.activeLayer.color;
			markup.data.color = $scope.activeLayer.color;
		}
	};

	/**
	 * Set active layer
	 * Set the active layer index and the active layer data
	 * @param {Number} index
	 */
	$scope.setActiveLayer = function(index){
		$scope.activeLayerIndex = index;
		$scope.activeLayer = $scope.layers[$scope.activeLayerIndex];
		$scope.broadcastLayers();
	};

	/**
	 * Clean the layers data structure
	 *   1. Remove empty layers
	 *   2. Only include the "data" field for each markup
	 **/ 
	$scope.cleanup = function(){
		var data = [];
		var i = 0;

		angular.forEach($scope.layers, function(layer, index){
			if(Object.keys(layer.markups).length > 0){
				data[i] = $.extend({}, layer);
				data[i].markups = [];

				angular.forEach(layer.markups, function(markup, markupIndex){
					data[i].markups.push(angular.copy(markup.data));
				});
				i++;
			}
		});

		return data;
	};

	/**
	 * Clear all layers and markups
	 **/
	$scope.clear = function(){
		$scope.layers = [];
		$scope.index = 0;
		$scope.options.name = 0;
		$scope.activeLayerIndex = 0;
		$window.annotationState.clearAnnotations();
		$scope.activeLayer = null;
	}

	/**
	 * Save the layers to a remote database
	 */
	$scope.save = function(){
		var data = $scope.cleanup($scope.layers);
		
		if(data.length){
			$http({
				method: 'POST',
				url: api.url + ':' + api.port + '/annotations',
				data: data
			});
		}
	};

	/**
	 * Load layers and markups from data source
	 */
	$scope.load = function(){
		$http({
			method: 'GET',
			url: api.url + ':' + api.port + '/annotations',
			params: {user_id: "Guest", image_id: $scope.options.imageId}
		}).then(function successCallback(response){
			if(response.data.code == 404) return;

			var markups = [];
			angular.forEach(response.data.layers, function(layer, index){
				angular.forEach(layer.markups, function(markup, junk){
					markups.push(markup);
				})
			});

			$window.annotationState.loadAnnotations(markups);
			
			for(var i=0; i < response.data.layers.length; i++){
				var layer = response.data.layers[i];
				$scope.layers.push(layer);
				var markups = $.extend([], layer.markups);
				$scope.layers[i].markups = {};

				for(var j=0; j < markups.length; j++){
					var index = markups[j].index;
					var antIndex = markupService.getAnnotationIndex(index);
					$scope.layers[i].markups[index] = $window.annotationState.annotations[antIndex];
				}
			}

 			$scope.setActiveLayer(0);
		}, function errorCallback(response){

		});
	};

	$scope.broadcastLayers = function(){
		var obj = {layers: $scope.layers, activeLayerIndex: $scope.activeLayerIndex};
		$scope.$broadcast('layers', obj);
	};
});
