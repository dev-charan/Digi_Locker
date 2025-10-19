import ratelimit from 'express-rate-limit'

export const rateLimit = ratelimit({
    windowMS:15 * 60 * 1000,
    max : 5,
    message:{
        error:"Too many login attemp, please try again later"
    }
})