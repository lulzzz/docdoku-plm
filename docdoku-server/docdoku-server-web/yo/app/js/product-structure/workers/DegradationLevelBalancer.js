/*global _,AppWorker,WorkerManagedValues*/
'use strict';
var DegradationLevelBalancer = {};

// Restrict the number of qualities asked to ADS
var availableLevels = [0, 1];

(function (DLB) {

    /*
     * Split an array into n arrays
     * */
    function splitArrayIntoArrays(a, n) {
        var len = a.length, out = [], i = 0;
        while (i < len) {
            var size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
        return out;
    }


    /*
     *  Spread qualities on maximum eligible parts
     *
     * input : list of sorted instances
     * output : directives array [{instance:instance,quality:quality}, ...];
     *
     * */


    DLB.apply = function (sorterResult) {
        AppWorker.log('%c SorterResult | eligible : ' + sorterResult.eligible + ' eliminated : ' + sorterResult.eliminated, 'DLB');

        var instancesList = sorterResult.sortedInstances;


        var directives = {};

        // Be sure that none of the rest of parts are on scene
        _(instancesList).each(function (instance) {
            directives[instance.id] = {
                instance: instance,
                quality: undefined
            };
        });

        // Take out maxInstances
        var shortenList = instancesList.splice(0, WorkerManagedValues.maxInstances);
        var onScene = 0;
        var explodedShortenList = splitArrayIntoArrays(shortenList, availableLevels.length);

        function getBestQuality(instance, i) {
            while (instance.qualities[i] === undefined && i > 0) {
                i--;
            }
            return i;
        }

        function degradeLevel(explodedListElements, i) {
            _.each(explodedListElements, function (instance) {
                var q = getBestQuality(instance, i);
                if (q !== undefined && instance.globalRating !== -1) {
                    onScene++;
                    directives[instance.id] = {
                        instance: instance,
                        quality: q
                    };
                } else {
                    // Else it must be unloaded
                    directives[instance.id] = {
                        instance: instance,
                        quality: undefined
                    };
                }
            });
        }

        for (var i = 0, l = explodedShortenList.length; i < l; i++) {
            degradeLevel(explodedShortenList[i], i);
        }

        AppWorker.log('%c Instances: ' + onScene, 'DLB');

        return {
            directives: _.values(directives).sort(function (a, b) {
                return b.instance.globalRating - a.instance.globalRating;
            }),
            onScene: onScene
        };
    };
})(DegradationLevelBalancer);