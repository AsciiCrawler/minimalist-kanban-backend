import { Injectable } from '@nestjs/common';
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import moment from 'moment';

@Injectable()
export class CloudwatchService {
    client: CloudWatchLogsClient = new CloudWatchLogsClient({
        region: "us-east-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
        }
    });

    cloudwatchLogin = async (data: { user: string, message: string }) => {
        try {
            const cdm = new PutLogEventsCommand({
                logGroupName: process.env.AWS_CLOUDWATCH_GROUP_NAME as string,
                logStreamName: process.env.AWS_CLOUDWATCH_STREAM_LOGIN as string,
                logEvents: [
                    {
                        timestamp: moment().unix() * 1000,
                        message: JSON.stringify(data)
                    }
                ]
            })
            this.client.send(cdm).then((res) => { }).catch(err => { console.warn({ err }); });
        } catch (error) {

        }
    }

    cloudwatchRegister = async (data: { user: string, message: string }) => {
        try {
            const cdm = new PutLogEventsCommand({
                logGroupName: process.env.AWS_CLOUDWATCH_GROUP_NAME as string,
                logStreamName: process.env.AWS_CLOUDWATCH_STREAM_REGISTER as string,
                logEvents: [
                    {
                        timestamp: moment().unix() * 1000,
                        message: JSON.stringify(data)
                    }
                ]
            })
            this.client.send(cdm).then((res) => { }).catch(err => { console.warn({ err }); });
        } catch (error) {

        }
    }

    cloudwatchHoneypot = async (data: { user: string, message: string }) => {
        try {
            const cdm = new PutLogEventsCommand({
                logGroupName: process.env.AWS_CLOUDWATCH_GROUP_NAME as string,
                logStreamName: process.env.AWS_CLOUDWATCH_STREAM_HONEYPOT as string,
                logEvents: [
                    {
                        timestamp: moment().unix() * 1000,
                        message: JSON.stringify(data)
                    }
                ]
            })
            this.client.send(cdm).then((res) => { }).catch(err => { console.warn({ err }); });
        } catch (error) {

        }
    }
}
