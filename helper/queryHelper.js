class QueryHelper {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    filter() {
        const queryObj = { ...this.queryStr };
        //console.log(queryObj)
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        //console.log(excludedFields)
        excludedFields.forEach(el => delete queryObj[el]);
        // console.log(queryObj.startDate)
        //console.log(excludedFields,queryObj)
        if (queryObj.startDate && queryObj.endDate) {
            queryObj.createdAt = { gte: new Date(queryObj["startDate"]), lte: new Date(queryObj["endDate"]) }
        } else if (queryObj.startDate) {
            queryObj.createdAt = { gte: new Date(queryObj["startDate"]) }
        } else if (queryObj.endDate) {
            queryObj.createdAt = { lte: new Date(queryObj["endDate"]) }
        }
        let queryStr = JSON.stringify(queryObj);
        //console.log(queryStr)
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        //console.log(queryStr)
        this.query = this.query.find(JSON.parse(queryStr));
        //console.log(this)
        return this;
    }

    sort() {
        if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    paginate() {
        const page = parseInt(this.queryStr.page) || 1;
        const limit = parseInt(this.queryStr.limit) || 500;
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }

    logFilter() {
        // const queryObj = { ...this.queryStr };
        // console.log(queryObj)
        // var result = (queryObj.logType).split('-');
        // this.query = this.query.find({logType:result});
        // return this;
        const queryObj = { ...this.queryStr };
        console.log(queryObj)
        console.log(queryObj.logType)
        let result
        if(queryObj.logType){
            result = (queryObj.logType).split('-');
            console.log(result)
            this.query = this.query.find({logType:result});
        }
        console.log(result)
       
        return this;
        
    }
}

module.exports = QueryHelper;