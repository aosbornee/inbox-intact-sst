# Inbox Intact Serverless Architecture

## How to use Prisma with SST

See the [example stack](stacks/index.ts) to see how the Prisma integration works. It creates a reusable Prisma layer that contains the necessary binaries that can be attached to all functions that need it. The only change required to your `schema.prisma` is the following, to pull the binary code needed for the AWS Lambda environment:

Make sure you generate the prisma code before you run `sst start` or `sst deploy`

```bash
$ yarn prisma generate
```

### Example event

```json
{
  "detail": {
    "userId": "user_2gSIaWug9uBqKUANWdrEA59UB4g"
  }
}
```
