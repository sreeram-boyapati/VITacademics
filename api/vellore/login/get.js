/*
 *  VITacademics
 *  Copyright (C) 2014  Aneesh Neelam <neelam.aneesh@gmail.com>
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
var path = require('path');
var unirest = require('unirest');

var log;
if (process.env.LOGENTRIES_TOKEN)
{
    var logentries = require('node-logentries');
    log = logentries.logger({
                                token: process.env.LOGENTRIES_TOKEN
                            });
}

var errors = require(path.join(__dirname, '..', 'error'));


exports.getCaptcha = function (RegNo, callback)
{
    var uri = 'https://academics.vit.ac.in/parent/captcha.asp';
    var onRequest = function (response)
    {
        if (response.error)
        {
            if (log)
                log.log('debug', errors.codes.Down);
            console.log('VIT Academics connection failed');
            callback(true, errors.codes.Down);
        }
        else
        {
            var myCookie = [];
            var onEach = function (key)
            {
                var regEx = new RegExp('ASPSESSION');
                if (regEx.test(key))
                {
                    myCookie[0] = key;
                    myCookie[1] = response.cookies[key];
                    return false;
                }
                return true;
            };
            Object.keys(response.cookies).forEach(onEach);
            cache.put(RegNo, myCookie, 180000);
            callback(null, response.body);
        }
    };
    unirest.get(uri)
        .encoding(null)
        .set('Content-Type', 'image/bmp')
        .end(onRequest);
};