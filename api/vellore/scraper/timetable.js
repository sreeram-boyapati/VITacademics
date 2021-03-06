/*
 *  VITacademics
 *  Copyright (C) 2014  Aneesh Neelam <neelam.aneesh@gmail.com>
 *  Copyright (C) 2014  Saurabh Joshi <battlex94@gmail.com>
 *  Copyright (C) 2014  Ayush Agarwal <agarwalayush161@gmail.com>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var cache = require('memory-cache');
var cheerio = require('cheerio');
var cookie = require('cookie');
var path = require('path');
var unirest = require('unirest');

var status = require(path.join(__dirname, '..', '..', 'status'));


exports.scrapeTimetable = function (RegNo, sem, firsttime, callback) {
    var timetableUri = 'https://academics.vit.ac.in/parent/timetable.asp?sem=' + sem;
    var CookieJar = unirest.jar();
    var myCookie = cache.get(RegNo).cookie;
    var cookieSerial = cookie.serialize(myCookie[0], myCookie[1]);
    var onRequest = function (response) {
        if (response.error) {
            callback(true, {status: status.codes.vitDown});
        }
        else {
            var timetable = {
                courses: [],
                timetable: {},
                withdrawn: false
            };
            try {
                var tmp = {};
                var scraper = cheerio.load(response.body);
                if (scraper('table table').length == 3) {
                    timetable.withdrawn = true;
                }
                scraper = cheerio.load(scraper('table table').eq(0).html());
                var length = scraper('tr').length;
                var onEach = function (i, elem) {
                    var $ = cheerio.load(scraper(this).html());
                    if (i > 0 && i < (length - 1)) {
                        var classnbr = $('td').eq(1).text();
                        var code = $('td').eq(2).text();
                        var courseType = $('td').eq(4).text();
                        var columns = $('td').length;
                        var slot = null;
                        var venue = null;
                        var faculty = null;
                        var registrationStatus = null;
                        var billDate = null;
                        var projectTitle = null;
                        if (columns === 13) {
                            slot = $('td').eq(8).text();
                            venue = $('td').eq(9).text();
                            faculty = $('td').eq(10).text();
                            registrationStatus = $('td').eq(11).text();
                            billDate = $('td').eq(12).text();
                        }
                        else if (columns === 12) {
                            projectTitle = $('td').eq(8).text().split(':')[1];
                            faculty = $('td').eq(9).text().split(':')[1];
                            registrationStatus = $('td').eq(10).text();
                            billDate = $('td').eq(11).text();
                        }
                        if (courseType == 'Embedded Theory') {
                            code = code + 'ETH';
                        }
                        else if (courseType == 'Embedded Lab') {
                            code = code + 'ELA';
                        }
                        else if (courseType == 'Theory Only') {
                            code = code + 'TH';
                        }
                        else if (courseType == 'Lab Only') {
                            code = code + 'LO';
                        }
                        tmp[code] = classnbr;
                        timetable['courses'].push({
                                                      'class_number': classnbr,
                                                      'course_code': $('td').eq(2).text(),
                                                      'course_title': $('td').eq(3).text(),
                                                      'course_type': courseType,
                                                      'ltpc': $('td').eq(5).text().replace(/[^a-zA-Z0-9]/g, ''),
                                                      'course_mode': $('td').eq(6).text(),
                                                      'course_option': $('td').eq(7).text(),
                            'slot': slot,
                            'venue': venue,
                            'faculty': faculty,
                            'registration_status': registrationStatus,
                            'bill_date': billDate,
                            'project_title': projectTitle
                                                  });
                    }
                };
                scraper('tr').each(onEach);
                if (firsttime || timetable.withdrawn) {
                    scraper = cheerio.load(response.body);
                    if (timetable.withdrawn) {
                        scraper = cheerio.load(scraper('table table').eq(2).html());
                    }
                    else {
                        scraper = cheerio.load(scraper('table table').eq(1).html());
                    }
                    length = scraper('tr').length;
                    var onEachRow = function (i, elem) {
                        var day = [];
                        var $ = cheerio.load(scraper(this).html());
                        if (i > 1) {
                            length = $('td').length;
                            for (var elt = 1; elt < length; elt++) {
                                var text = $('td').eq(elt).text().split(' ');
                                var sub = text[0] + text[2];
                                if (tmp[sub]) {
                                    day.push(Number(tmp[sub]));
                                }
                                else {
                                    day.push(0);
                                }
                            }
                            switch (i) {
                                case 2:
                                    timetable.timetable.mon = day;
                                    break;
                                case 3:
                                    timetable.timetable.tue = day;
                                    break;
                                case 4:
                                    timetable.timetable.wed = day;
                                    break;
                                case 5:
                                    timetable.timetable.thu = day;
                                    break;
                                case 6:
                                    timetable.timetable.fri = day;
                                    break;
                                case 7:
                                    timetable.timetable.sat = day;
                                    break;
                            }
                        }
                    };
                    scraper('tr').each(onEachRow);
                }
                timetable.status = status.codes.success;
                callback(null, timetable);
            }
            catch (ex) {
                // Scraping Timetable failed
                callback(true, {status: status.codes.invalid});
            }
        }
    };
    CookieJar.add(unirest.cookie(cookieSerial), timetableUri);
    unirest.post(timetableUri)
        .jar(CookieJar)
        .end(onRequest);
};
