const router = require('express').Router()
const User = require('../models/user')

//displays all user
router.get('/', async (req, res) => {
    try{
        const users = await User.find({})
        res.status(200).json(users)
    }catch(error){
        console.log(error)
    }
})

//register user
router.post('/register', async (req, res) => {
    try{
        const { name, email } = req.body
        if(!name || !email){
            return res.json({ error: "Email or Name should not be empty."})
        }

        const user = await User.create({
            name,
            email
        })

        console.log(user)
        return res.status(200).json(user)
    }catch(error){
        console.log(error)
    }
})

module.exports = router;