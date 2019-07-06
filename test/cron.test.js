const cronParser = require("../modules/lib/cron");
const assert = require('assert');

describe('divided', function() {

    it('cron (* * * * *), 2019/06/01 10:00', function () {
        const exp = cronParser("* * * * *");

        const match = exp.match(new Date(2019,6,1, 10,00));
        assert.equal(match, true);
    });

    it('cron (10 * * * *), 2019/06/01 10:00', function () {
        const exp = cronParser("10 * * * *");

        const match = exp.match(new Date(2019,6,1, 10,10));
        assert.equal(match, true);
    });

    it('cron (10-12 * * * *), 2019/06/01 10:00', function () {
        const exp = cronParser("10-12 * * * *");

        const match1 = exp.match(new Date(2019,6,1, 10,10));
        assert.equal(match1, true);

        const match2 = exp.match(new Date(2019,6,1, 10,11));
        assert.equal(match2, true);

        const match3 = exp.match(new Date(2019,6,1, 10,12));
        assert.equal(match3, true);

        const match4 = exp.match(new Date(2019,6,1, 10,13));
        assert.equal(match4, false);
    });
    
});