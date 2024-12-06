# Identify celebrity faces in an image and return useful information

This sample will allow you to deploy a bot to your AWS Wickr network that will take an image (from camera or uploaded file) and identify the celebrity featured in the image. It will then call Amazon Bedrock Anthropic Claude Instant LLM to return the celebrity name and useful information.

## Prerequisites and limitations

## Prerequisites

- An existing AWS Wickr bot username and password
- A supported host with Docker CE installed. This repo was tested on Ubuntu 22.04
- One Amazon Simple Storage Service (Amazon S3) buckets for storage of your images so they can be analyzed
- IAM credentials configured on the host in the `~/.aws/config` and `~/.aws/credentials` file (see [here](https://docs.aws.amazon.com/cli/latest/reference/configure/) for details). The user must have the following IAM policy at a minimum (update with your Amazon S3 bucket name):
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "rekognition:RecognizeCelebrities",
            "Resource": "*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "bedrock:InvokeModel"
            ],
            "Resource": [
                "arn:aws:s3:::<amazon-s3-bucket>/*",
                "arn:aws:bedrock:<region>::foundation-model/anthropic.claude-v2"
            ]
        }
    ]
}
```

## Limitations

- This bot will store images on the host where the bot is running, inside the `/opt/WickrIO/clients/<username>/attachments/` directory. To periodically delete these, you could configure a [crontab](https://help.ubuntu.com/community/CronHowto) with the following entry to delete data when it is older than 1 day: `0 0 * * * /usr/bin/find /opt/WickrIO/clients/celeb-rekog/attachments/ -name "*" -type f -mtime +1 -exec rm -f {} \;` 

## Installation

1. Clone this repo and then enter the directory.
2. Confirm you are within the repo directory, then zip and compress the contents: `tar czvf software.tar.gz *`. This will leave you with a file called `software.tar.gz`
3. Create the bot folder: `sudo mkdir /opt/WickrIO`
4. Copy this file to /opt/WickrIO: `sudo cp software.tar.gz /opt/WickrIO/`
5. Start the WickrIO container with the following command: `docker run -v /home/ubuntu/.aws:/home/wickriouser/.aws -v /opt/WickrIO:/opt/WickrIO --restart=always --name="celeb-rekog" -ti public.ecr.aws/x3s2s6k3/wickrio/bot-cloud:latest`
6. You will now be at the command line within the bot.

## Configuration

1. Select `yes` if you wish see welcome message on startup
2. Enter `add` when prompted to enter a command
3. Enter the bot username and password when prompted
4. Select `yes` to auto-login
5. When asked to **Enter the bot configuration to use**, enter `import`
6. When asked for the location, enter `/opt/WickrIO`
7. Enter `celeb-rekog` for the integration name

The bot will now install.

8. When asked, enter your AWS account region
9. Enter the name of the S3 bucket created for uploaded images
10. When you see **Successfully added record to the database!**, enter `start` and then provide the password when prompted
12. Type `list` to see the status of the bot, it should say **Running** after a few seconds
13. Sent a photo of a celebrity to the bot!

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
