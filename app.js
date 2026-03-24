const express = require('express');
const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');

const app = express();
app.set('port', process.env.PORT || 3000);

let db;

let databaseError = false;

const client = new MongoClient(config.mongoUrl);

client
    .connect()
    .then(client => {
        db = client.db(config.dbName);
        app.listen(app.get('port'), () => {
            console.log(`Server is running on port ${app.get('port')}`);
        });
    })
    .catch(err => {
        databaseError = true;
        app.listen(app.get('port'), () => {
            console.log(`Server is running on port ${app.get('port')}`);
        });
    });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', (req, res, next) => {
    if (databaseError) {
        res.status(503).json({ error: 'Resource unavailable' });
    } else {
        next();
    }
});

app.get('/api/type/:type', (req, res, next) => {
    const collection = db.collection('posts');
    collection
        .find({ type: req.params.type })
        .toArray()
        .then(posts => {
            res.send(posts);
        })
        .catch(next);
});

const uploadsPath = config.uploadsPath;

app.use('/uploads', express.static(`${__dirname}/${uploadsPath}`));
// app.use('/', express.static(`${__dirname}/front/public`));
// app.get(['*'], (req, res) =>
//     res.sendFile(path.resolve(`${__dirname}/front/public/index.html`))
// );

app.use((err, req, res, next) => {
    console.log(err);
    console.log(err.message);
    if (typeof err === 'string') {
        res.status(422).send({ error: err });
    } else if (typeof err.message === 'string') {
        res.status(422).send({ error: err.message });
    } else if (err.errors) {
        const firstError = Object.keys(err.errors)[0];
        res.status(422).send({ error: err.errors[firstError].message });
    } else {
        res.status(422).send(err.message);
    }
});
