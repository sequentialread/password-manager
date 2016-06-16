'use strict';

import template from './home.tmpl.html!text'

function joinerator(array1, array2, joinFunction) {
  var result = [];
  for(var i = 0; i < Math.min(array1.length, array2.length); i++) {
    result[i] = joinFunction(array1[i], array2[i]);
  }
  return result;
}

var HomeController = ['$state', 'RestService', 'windowViewModel', 'config',
function HomeController($state, RestService, windowViewModel, config) {

  var getEnvConfig = (rancherEnv) => {
    var results = config.peoplenetProductEnvironments
      .filter(x => x.name.toLowerCase() == rancherEnv.name.toLowerCase());
    return results.length ? results[0] : null;
  };

  var getStacksURL = (environmentId) =>
    `${config.rancherApiEnvironmentsName}/${environmentId}/${config.rancherApiStacksName}`;

  var objectForEach = (object, keyValueAction) => {
    for(var paramName in object) {
      if(object.hasOwnProperty(paramName)) {
        keyValueAction(paramName, object[paramName]);
      }
    }
  };

  var objectKeyCount = (object) => {
    var count = 0;
    objectForEach(object, () => count ++);
    return count;
  };

  var logicalXOR = (a, b) => !a != !b;

  if(!windowViewModel.UserInfo.LoggedIn) {
    $state.go('requestApiKeys');
  }

  this.windowViewModel = windowViewModel;

  this.toggleStackDrilldown = (targetRow) =>
    this.rows.forEach(row => row.open = logicalXOR(row.fullName.indexOf(targetRow.name) == 0, row.open));

  RestService.rancherGet(`${config.rancherApiEnvironmentsName}/`)
  .then((result) => {
    if(result.data.length == 0) {
      this.displayRancherBugExplaination = true;
    } else {
      this.environments = result.data
        .filter(getEnvConfig)
        .sort((a,b) => getEnvConfig(b).sortOrder - getEnvConfig(a).sortOrder);

      var allServicesAndConfigsPromises = [];
      Promise.all(this.environments.map((environment) =>
        RestService.rancherGet(getStacksURL(environment.id))
      ))
      .then(results => {
        var stacks = {};
        joinerator(this.environments, results, (environment, result) => ({environment, result}) )
        .forEach(joined =>
          joined.result.data.forEach(stack => {
            var stackName = stack.name.toLowerCase();
            stacks[stackName] = !stacks[stackName] ? {services: {}, environments: {}} : stacks[stackName];

            var stackContainer = {stack:stack};
            var servicesContainer = stacks[stackName].services;
            stacks[stackName].environments[joined.environment.id] = stackContainer;
            allServicesAndConfigsPromises.push(
              RestService.rancherGet(`${getStacksURL(joined.environment.id)}/${stack.id}/services`)
              .then((result) => {
                result.data.forEach((service) => {
                  var serviceName = service.name.toLowerCase();
                  servicesContainer[serviceName] = !servicesContainer[serviceName] ? {} : servicesContainer[serviceName];
                  servicesContainer[serviceName][joined.environment.id] = service;
                });
              }),
              RestService.rancherPost(`${getStacksURL(joined.environment.id)}/${stack.id}/?action=exportconfig`)
              .then((result) => stackContainer.composeConfig = result)
            );
          })
        );
        this.stacks = stacks;
      }).then(() => {
        Promise.all(allServicesAndConfigsPromises)
        .then(results => {
          var environmentById = (id) => this.environments.filter(x => x.id == id)[0];
          var rows = [];
          objectForEach(this.stacks, (stackName, stack) => {
            var hasServices = objectKeyCount(stack.services) > 0;
            var row = {name:stackName, fullName:stackName, hasServices:hasServices, open:false};

            row.environments = this.environments.map(environment => {
              var compareResultPlaceholder = {id:environment.id};

              compareResultPlaceholder.equivalentEnvironment =
                stack.environments[environment.id] ? environment.name : null;

              return compareResultPlaceholder;
            });
            rows.push(row);

            objectForEach(stack.services, (serviceName, service) => {
              var row = {name:serviceName, fullName:`${stackName}:${serviceName}`, isService: true};
              row.environments = this.environments.map(environment => {
                var compareResultPlaceholder = {id:environment.id};

                compareResultPlaceholder.equivalentEnvironment =
                  service[environment.id] ? environment.name : null;

                return compareResultPlaceholder;
              });
              rows.push(row);
            });
          });
          this.rows = rows;
        });
      });

    }
  });



}];

export default function registerRouteAndController($stateProvider) {
  return $stateProvider.state(
    'home',
    {
      url: '/',
      template: template,
      controller: HomeController,
      controllerAs: 'vm'
    }
  );
}
