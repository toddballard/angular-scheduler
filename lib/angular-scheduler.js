/***************************************************************************
 * angular-scheruler.js
 * 
 * Copyright (c) 2014 Ansible, Inc.
 *
 * Maintainers:
 *
 * Chris Houseknecht
 *   @chouseknecht
 *   chouse@ansible.com 
 *
 */

/* global RRule */

'use strict';

angular.module('AngularScheduler', ['Timezones'])

    .constant('$timezones.definitions.location', '/bower_components/angular-timezones/tz/data')
    .constant('scheduler_partial', '/lib/angular-scheduler.html')

    // Initialize supporting scope variables and functions. Returns a scheduler object with getString(),
    // setString() and inject() methods.
    .factory('SchedulerInit', ['$filter', '$timezones', 'LoadLookupValues', 'SetDefaults', 'CreateObject',
    function($filter, $timezones, LoadLookupValues, SetDefaults, CreateObject) {
        return function(params) {
               
            var scope = params.scope;

            if (scope.removeZonesReady) {
                scope.removeZonesReady();
            }
            scope.removeZonesReady = scope.$on('zonesReady', function() {
                var i;
                scope.timeZones = JSON.parse(localStorage.zones);
                scope.current_timezone = $timezones.getLocal();
                if (!$.isEmptyObject(scope.current_timezone) && scope.current_timezone.name)
                    // Set the <select> to the browser's local timezone
                    for (i=0; i < scope.timeZones.length; i++) {
                        if (scope.timeZones[i].name === scope.current_timezone.name) {
                            scope.schedulerTimeZone = scope.timeZones[i];
                        }
                    }
                else {
                    scope.schedulerTimeZone = null;
                }
            });

            // Build list of timezone <select> element options
            $timezones.getZoneList(scope);

            scope.scheduleTimeChange = function() {
                if (scope.schedulerStartDt) {
                    scope.resetStartDate();
                    try {
                        var dateStr = scope.schedulerStartDt + 'T' + scope.schedulerStartHour + ':' + scope.schedulerStartMinute +
                            ':' + scope.schedulerStartSecond + '.000Z';
                        scope.schedulerUTCTime = $timezones.toUTC(dateStr, scope.schedulerTimeZone.name).toISOString();

                        /*var tzDate = $timezones.align(new Date(Date.parse(scope.schedulerStartDt + 'T' + scope.schedulerStartHour + ':' + scope.schedulerStartMinute +
                            ':' + scope.schedulerStartSecond + '.000Z')), scope.schedulerTimeZone.name),
                            newDate = new Date(tzDate.getTime() + (tzDate.getTimezoneOffset() * 60000));
                        scope.schedulerUTCTime = newDate.toISOString();*/
                    }
                    catch(e) {
                        scope.startDateError("Provide a valid start date and time");
                    }
                }
                else {
                    scope.schedulerUTCTime = '';
                }
            };

            scope.scheduleRepeatChange = function() {
                if (scope.schedulerFrequency && scope.schedulerFrequency.value !== '' && scope.schedulerFrequency.value !== 'none') {
                    scope.schedulerInterval = 1;
                    scope.schedulerShowInterval = true;
                    scope.schedulerIntervalLabel = scope.schedulerFrequency.intervalLabel;
                }
                else {
                    scope.schedulerShowInterval = false;
                    scope.schedulerEnd = scope.endOptions[0];
                }
            };

            scope.showCalendar = function(fld) {
                $('#' + fld).focus();
            };

            scope.monthlyRepeatChange = function() {
                if (scope.monthlyRepeatOption !== 'day') {
                    $('#monthDay').spinner('disable');
                }
                else {
                    $('#monthDay').spinner('enable');
                }
            };

            scope.yearlyRepeatChange = function() {
                if (scope.yearlyRepeatOption !== 'month') {
                    $('#yearlyRepeatDay').spinner('disable');
                }
                else {
                    $('#yearlyRepeatDay').spinner('enable');
                }
            };

            scope.setWeekday = function(day) {
                // Add or remove day when user clicks checkbox button
                var i = scope.weekDays.indexOf(day);
                if (i >= 0) {
                    scope.weekDays.splice(day,1);
                }
                else {
                    scope.weekDays.push(day);
                }
            };

            scope.startDateError = function(msg) {
                if (scope.scheduler_form) {
                    scope.scheduler_form_schedulerStartDt_error = msg;
                    scope.scheduler_form.schedulerStartDt.$pristine = false;
                    scope.scheduler_form.schedulerStartDt.$dirty = true;
                    $('#schedulerStartDt').removeClass('ng-pristine').removeClass('ng-valid').removeClass('ng-valid-custom-error')
                        .addClass('ng-dirty').addClass('ng-invalid').addClass('ng-invalid-custom-error');
                }
            };

            scope.resetStartDate = function() {
                if (scope.scheduler_form) {
                    scope.scheduler_form_schedulerStartDt_error = '';
                    scope.scheduler_form.schedulerStartDt.$setValidity('custom-error', true);
                    scope.scheduler_form.schedulerStartDt.$setPristine();
                }
            };

            LoadLookupValues(scope);
            SetDefaults(scope);
            scope.scheduleTimeChange();

            return CreateObject(scope);
            
        };
    }])

    .factory('CreateObject', ['$filter', 'GetRule', 'Inject', 'SetDefaults', '$timezones',
    function($filter, GetRule, Inject, SetDefaults, $timezones) {
        return function(scope) {
            var fn = function() {
                
                this.scope = scope;
                
                // Evaluate user intput and build options for passing to rrule
                this.getOptions = function() {
                    var options = {};
                    options.startDate = this.scope.schedulerUTCTime;
                    options.frequency = this.scope.schedulerFrequency.value;
                    options.interval = this.scope.schedulerInterval;
                    if (this.scope.schedulerEnd.value === 'after') {
                        options.occurrenceCount = this.scope.schedulerOccurrenceCount;
                    }
                    if (this.scope.schedulerEnd.value === 'on') {
                        options.endDate = this.scope.schedulerEndDt;
                    }
                    if (this.scope.schedulerFrequency.value === 'weekly') {
                        options.weekDays = this.scope.weekDays;
                    }
                    else if (this.scope.schedulerFrequency.value === 'yearly') {
                        if (this.scope.yearlyRepeatOption === 'month') {
                            options.month = this.scope.yearlyMonth.value;
                            options.monthDay = this.scope.yearlyMonthDay;
                        }
                        else {
                            options.setOccurrence = this.scope.yearlyOccurrence.value;
                            options.weekDays = this.scope.yearlyWeekDay.value;
                            options.month = this.scope.yearlyOtherMonth.value;
                        }
                    }
                    else if (this.scope.schedulerFrequency.value === 'monthly') {
                        if (this.scope.monthlyRepeatOption === 'day') {
                            options.monthDay = this.scope.monthDay;
                        }
                        else {
                            options.setOccurrence = this.scope.monthlyOccurrence.value;
                            options.weekDays = this.scope.monthlyWeekDay.value;
                        }
                    }
                    return options;
                };

                // Clear custom field errors
                this.clearErrors = function() {
                    this.scope.scheduler_weekDays_error = false;
                    this.scope.scheduler_endDt_error = false;
                    this.scope.resetStartDate();
                    this.scope.scheduler_endDt_error = false;
                    this.scope.scheduler_form.schedulerEndDt.$setValidity('custom-error', true);
                    this.scope.scheduler_form.schedulerEndDt.$setPristine();
                    this.scope.scheduler_form.$setPristine();
                };

                // Check the input form for errors
                this.isValid = function() {
                    var startDt, now, dateStr, adjNow, validity = true;
                    this.clearErrors();
                    
                    if (this.scope.schedulerFrequency.value === 'weekly' && scope.weekDays.length === 0) {
                        this.scope.scheduler_weekDays_error = true;
                        validity = false;
                    }
                    if (!this.scope.scheduler_form.scheduleName.$valid) {
                        // Make sure scheduleName requird error shows up
                        this.scope.scheduler_form.scheduleName.$dirty = true;
                        $('#scheduleName').addClass('ng-dirty');
                        validity = false;
                    }
                    if (this.scope.schedulerEnd.value === 'on') {
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(this.scope.schedulerEndDt)) {
                            this.scope.scheduler_form.schedulerEndDt.$pristine = false;
                            this.scope.scheduler_form.schedulerEndDt.$dirty = true;
                            $('#schedulerEndDt').removeClass('ng-pristine').removeClass('ng-valid').removeClass('ng-valid-custom-error')
                                .addClass('ng-dirty').addClass('ng-invalid').addClass('ng-invalid-custom-error');
                            this.scope.scheduler_endDt_error = true;
                            validity = false;
                        }
                    }
                    if (this.scope.schedulerUTCTime) {
                        startDt = new Date(this.scope.schedulerUTCTime);
                        now = new Date();
                        dateStr = now.getFullYear() + '-' +
                            $filter('schZeroPad')(now.getMonth() + 1, 2)+ '-' +
                            $filter('schZeroPad')(now.getDate(),2) + 'T' +
                            $filter('schZeroPad')(now.getHours(),2) + ':' +
                            $filter('schZeroPad')(now.getMinutes(),2) + ':' +
                            $filter('schZeroPad')(now.getSeconds(),2) + '.000Z';
                        adjNow = $timezones.toUTC(dateStr, this.scope.schedulerTimeZone.name);   //Adjust to the selected TZ 
                        if (adjNow.getTime() >= startDt.getTime()) {
                            validity = false;
                            this.scope.startDateError("Start date and time must be in the future");
                        }
                    }
                    else {
                        scope.startDateError("Provide a valid start date and time");
                        validity = false;
                    }
                    return validity;
                };

                // Returns an rrule object
                this.getRule = function() {
                    var options = this.getOptions();
                    return GetRule(options);
                };

                // Return object containing schedule name, string representation of rrule per iCalendar RFC,
                // and options used to create rrule
                this.getValue = function() {
                    var rule = this.getRule(),
                        options = this.getOptions();
                    return {
                        name: scope.scheduleName,
                        rrule: rule.toString(),
                        options: options
                    };
                };

                // Read in the HTML partial, compile and inject it into the DOM. 
                // Pass in the target element's id attribute value or an angular.element()
                // object.
                this.inject = function(element, showButtons) {
                    return Inject({ scope: this.scope, target: element, buttons: showButtons });
                };

                // Clear the form, returning all elements to a default state
                this.clear = function() {
                    this.clearErrors();
                    this.scope.scheduler_form.scheduleName.$setPristine();
                    SetDefaults(this.scope);
                };
            };
            return new fn();
        };
    }])

    .factory('Inject', ['scheduler_partial', '$compile', '$http', '$log', function(scheduler_partial, $compile, $http, $log) {
        return function(params) {
            
            var scope = params.scope,
                target = params.target,
                buttons = params.buttons;

            if (scope.removeHtmlReady) {
                scope.removeHtmlReady();
            }
            scope.removeHtmlReady = scope.$on('htmlReady', function(e, data) {
                var element = (angular.isObject(target)) ? target : angular.element(document.getElementById(target));
                element.html(data);
                $compile(element)(scope);
                if (buttons) {
                    $('#scheduler-buttons').show();
                }
            });

            $http({ method: 'GET', url: scheduler_partial })
                .success( function(data) {
                    scope.$emit('htmlReady', data);
                })
                .error( function(data, status) {
                    $log.error('Error calling ' + scheduler_partial + '. ' + status);
                });
        };
    }])

    .factory('GetRule', ['$log', function($log) {
        return function(params) {
            // Convert user inputs to an rrule. Returns rrule object using https://github.com/jkbr/rrule
            // **list of 'valid values' found below in LoadLookupValues 
            
            var startDate = params.startDate,  // date object or string in yyyy-MM-ddTHH:mm:ss.sssZ format
                frequency = params.frequency,  // string, optional, valid value from frequencyOptions
                interval = params.interval,    // integer, optional 
                occurrenceCount = params.occurrenceCount,  //integer, optional
                endDate = params.endDate,      // date object or string in yyyy-MM-dd format, optional
                                               // ignored if occurrenceCount provided
                month = params.month,          // integer, optional, valid value from months
                monthDay = params.monthDay,    // integer, optional, between 1 and 31
                weekDays = params.weekDays,     // integer, optional, valid value from weekdays
                setOccurrence = params.setOccurrence, // integer, optional, valid value from occurrences
                options = {}, i;
            
            if (angular.isDate(startDate)) {
                options.dtstart = startDate;
            }
            else {
                try {
                    options.dtstart = new Date(startDate);
                }
                catch(e) {
                    $log.error('Date conversion failed. Attempted to convert ' + startDate + ' to Date. ' + e.message);
                }
            }

            if (frequency && frequency !== 'none') {
                options.freq = RRule[frequency.toUpperCase()];
                options.interval = interval;
                
                if (weekDays && typeof weekDays === 'string') {
                    options.byweekday = RRule[weekDays.toUpperCase()];
                }

                if (weekDays && angular.isArray(weekDays)) {
                    options.byweekday = [];
                    for (i=0; i < weekDays.length; i++) {
                        options.byweekday.push(RRule[weekDays[i].toUpperCase()]);
                    }
                }

                if (setOccurrence !== undefined && setOccurrence !== null) {
                    options.bysetpos = setOccurrence;
                }

                if (month) {
                    options.bymonth = month;
                }

                if (monthDay) {
                    options.bymonthday = monthDay;
                }

                if (occurrenceCount) {
                    options.count = occurrenceCount;
                }
                else if (endDate) {
                    if (angular.isDate(endDate)) {
                        options.until = endDate;
                    }
                    else {
                        try {
                            options.until = new Date(endDate);
                        }
                        catch(e) {
                            $log.error('Date conversion failed. Attempted to convert ' + endDate + ' to Date. ' + e.message);
                        }
                    }
                }
            }
            else {
                // We only want to run 1x
                options.freq = RRule.DAILY;
                options.interval = 1;
                options.count = 1;
            }

            return new RRule(options);
        };
    }])

    .factory('SetDefaults', ['$filter', function($filter) {
        return function(scope) {
            // Set default values
            var defaultDate = new Date(),
                defaultMonth = $filter('schZeroPad')(defaultDate.getMonth() + 1, 2),
                defaultDay = $filter('schZeroPad')(defaultDate.getDate(), 2),
                defaultDateStr = defaultDate.getFullYear() + '-' + defaultMonth + '-' + defaultDay;
            scope.scheduleName = '';
            scope.weekDays = [];
            scope.schedulerStartHour = '00';
            scope.schedulerStartMinute = '00';
            scope.schedulerStartSecond = '00';
            scope.schedulerStartDt = defaultDateStr;
            scope.schedulerFrequency = scope.frequencyOptions[0];
            scope.schedulerShowEvery = false;
            scope.schedulerEnd = scope.endOptions[0];
            scope.schedulerOccurrenceCount = 1;
            scope.monthlyRepeatOption = 'day';
            scope.monthDay = 1;
            scope.monthlyOccurrence = scope.occurrences[0];
            scope.monthlyWeekDay = scope.weekdays[0];
            scope.yearlyRepeatOption = 'month';
            scope.yearlyMonth = scope.months[0];
            scope.yearlyMonthDay = 1;
            scope.yearlyWeekDay = scope.weekdays[0];
            scope.yearlyOtherMonth = scope.months[0];
            scope.yearlyRepeatOccurrence = scope.occurrences[0];
        };
    }])

    .factory('LoadLookupValues', [ function() {
        return function(scope) {
        
            scope.frequencyOptions = [
                { name: 'None (run once)', value: 'none', intervalLabel: '' },
                { name: 'Minutely', value: 'minutely', intervalLabel: 'minutes' },
                { name: 'Hourly', value: 'hourly', intervalLabel: 'hours' },
                { name: 'Daily', value: 'daily', intervalLabel: 'days' },
                { name: 'Weekly', value: 'weekly', intervalLabel: 'weeks' },
                { name: 'Monthly', value: 'monthly', intervalLabel: 'months' },
                { name: 'Yearly', value: 'yearly', intervalLabel: 'years' }
            ];

            scope.endOptions = [
                { name: 'Never', value: 'never' },
                { name: 'After', value: 'after' },
                { name: 'On Date', value: 'on' }
            ];

            scope.occurrences = [
                { name: 'first', value: 1 },
                { name: 'second', value: 2 },
                { name: 'third', value: 3 },
                { name: 'fourth', value: 4 },
                { name: 'last', value: -1 }
            ];

            scope.weekdays = [
                { name: 'Sunday', value: 'su' },
                { name: 'Monday', value: 'mo' },
                { name: 'Tueday', value: 'tu' },
                { name: 'Wednesday', value: 'we' },
                { name: 'Thursday', value: 'th' },
                { name: 'Friday', value: 'fr' },
                { name: 'Saturday', value: 'sa' },
                { name: 'Day', value: ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] },
                { name: 'Weekday', value: ['mo', 'tu', 'we', 'th', 'fr'] },
                { name: 'Weekend day', value: ['sa', 'su'] }
            ];

            scope.months = [
                { name: 'January', value: 1 },
                { name: 'February', value: 2 },
                { name: 'March', value: 3 },
                { name: 'April', value: 4 },
                { name: 'May', value: 5 },
                { name: 'June', value: 6 },
                { name: 'July', value: 7 },
                { name: 'August', value: 8 },
                { name: 'September', value: 9 },
                { name: 'October', value: 10 },
                { name: 'November', value: 11 },
                { name: 'December', value: 12 }
            ];

        };
    }])
   
    // $filter('afZeroPad')(n, pad) -- or -- {{ n | afZeroPad:pad }}
    .filter('schZeroPad', [ function() {
        return function (n, pad) {
            var str = (Math.pow(10,pad) + '').replace(/^1/,'') + (n + '').trim();
            return str.substr(str.length - pad);
        };
    }])

    .directive('schTooltip', [ function() {
        return {
            link: function(scope, element, attrs) {
                var placement = (attrs.placement) ? attrs.placement : 'top';
                $(element).tooltip({
                    html: true,
                    placement: placement,
                    title: attrs.afTooltip,
                    trigger: 'hover',
                    container: 'body'
                });
            }
        };
    }])

    .directive('schDatePicker', [ function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs) {
                    var options = {},
                        variable = attrs.ngModel,
                        defaultDate = new Date();
                    options.dateFormat = attrs.dateFormat || 'yy-mm-dd';
                    options.defaultDate = scope[variable];
                    options.minDate = (attrs.minToday) ? defaultDate : null;
                    options.maxDate = (attrs.maxDate) ? new Date(attrs('maxDate')) : null;
                    options.changeMonth = (attrs.changeMonth === "false")  ? false : true;
                    options.changeYear = (attrs.changeYear === "false") ? false : true;
                    $(element).datepicker(options);
                }
        };
    }])

    // Custom directives 
    .directive('schSpinner', ['$filter', function($filter) {
        return {
            require: 'ngModel',
            link: function(scope, element, attr, ctrl) {
                // Add jquerui spinner to 'spinner' type input
                var form = attr.schSpinner,
                    zeroPad = attr.zeroPad;
                $(element).spinner({
                    stop: function() {
                        if (zeroPad) {
                            scope[attr.ngModel] = $filter('schZeroPad')($(this).val(),zeroPad);
                            $(this).val(scope[attr.ngModel]);
                        }
                        else {
                            scope[attr.ngModel] = $(this).spinner('value');
                        }
                        if (attr.ngChange) {
                            scope.$apply(scope[attr.ngChange]);
                        }
                    },
                    spin: function() {
                        scope[form].$setDirty();
                        ctrl.$dirty = true;
                        ctrl.$pristine = false;
                        if (!scope.$$phase) {
                            scope.$digest();
                        }
                    }
                });
            }
        };
    }]);


            