const { SLS } = require('aliyun-sdk')
const util = require('util')
const colors = require('colors/safe')

class Logs {
  constructor(credentials, region) {
    this.slsClient = new SLS({
      accessKeyId: credentials.AccessKeyID,
      secretAccessKey: credentials.AccessKeySecret,
      endpoint: `http://${region}.sls.aliyuncs.com`,
      apiVersion: '2015-06-01'
    })
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  async getLogs(
    projectName,
    logStoreName,
    timeStart,
    timeEnd,
    serviceName,
    functionName,
    query,
    error
  ) {
    const param = {
      projectName: projectName,
      logStoreName: logStoreName,
      from: timeStart,
      to: timeEnd,
      topic: serviceName,
      query: functionName
    }

    let logCount = 1
    let getCount = 0
    let times = 10
    const logsList = {}
    while (getCount != logCount && times > 0) {
      times = times - 1
      const handle = util.promisify(this.slsClient.getLogs.bind(this.slsClient))
      let result
      try {
        const temp = await handle(param)
        logCount = temp['headers']['x-log-count']
        result = temp['body']
      } catch (ex) {
        result = {}
      }

      let requestId
      for (const item in result) {
        getCount = getCount + 1
        const eveLog = result[item]
        const requestIdList = eveLog['message'].match('(\\w{8}(-\\w{4}){3}-\\w{12}?)')
        if (requestIdList) {
          requestId = requestIdList[0]
        }
        if (requestId) {
          if (!logsList.hasOwnProperty(requestId)) {
            const date = new Date(Number(eveLog['__time__']) * 1000)
            const year = date.getFullYear()
            const month = date.getMonth() < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1
            const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
            const hour = date.getHours() < 10 ? '0' + date.getHours() : date.getHours()
            const minute = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()
            const second = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()

            logsList[requestId] = {
              time: `${year}-${month}-${day} ${hour}:${minute}:${second}  (${eveLog['__time__']})`,
              message: ''
            }
          }
          logsList[requestId]['message'] = logsList[requestId]['message'] + eveLog['message']
        }
      }
    }

    const resultList = {}
    for (const item in logsList) {
      const tempLog = logsList[item]['message'].replace(new RegExp(/(\r)/g), '\n')
      logsList[item]['message'] = tempLog
      if (query) {
        if (tempLog.indexOf(query) != -1) {
          if (error) {
            if (tempLog.indexOf(' [ERROR] ') != -1 && tempLog.indexOf('Error: ') != -1) {
              resultList[item] = logsList[item]
            }
          } else {
            resultList[item] = logsList[item]
          }
        }
      } else {
        if (error) {
          if (tempLog.indexOf(' [ERROR] ') != -1 && tempLog.indexOf('Error: ') != -1) {
            resultList[item] = logsList[item]
          }
        } else {
          resultList[item] = logsList[item]
        }
      }
    }
    return resultList
  }

  async history(
    projectName,
    logStoreName,
    timeStart,
    timeEnd,
    serviceName,
    functionName,
    query,
    error
  ) {
    const result = await this.getLogs(
      projectName,
      logStoreName,
      timeStart,
      timeEnd,
      serviceName,
      functionName,
      query,
      error
    )

    for (const item in result) {
      console.log(
        `${colors.blue('RequestId')} : ${item}\n${colors.blue('DateTime')} : ${
          result[item]['time']
        }\n${colors.blue('Message')} :\n${result[item]['message']}\n\n`
      )
    }
  }

  async realtime(projectName, logStoreName, serviceName, functionName, query, error) {
    let timeStart = parseInt(Date.now() / 1000)
    let timeEnd = parseInt(Date.now() / 1000)
    let times = 1800
    const output = []
    while (times > 0) {
      await this.sleep(1000)
      times = times - 1
      const result = await this.getLogs(
        projectName,
        logStoreName,
        timeStart,
        timeEnd,
        serviceName,
        functionName,
        query,
        error
      )

      for (const item in result) {
        if (output.indexOf(item) == -1) {
          output.push(item)
          console.log(
            `${colors.blue('RequestId')} : ${item}\n${colors.blue('DateTime')} : ${
              result[item]['time']
            }\n${colors.blue('Message')} :\n${result[item]['message']}\n\n`
          )
        }
      }

      timeStart = timeEnd - 60 >= timeStart ? timeEnd - 60 : timeStart
      timeEnd = parseInt(Date.now() / 1000)
    }
  }
}

module.exports = Logs
