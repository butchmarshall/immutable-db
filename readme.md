# immutable-orm [![npm version](https://badge.fury.io/js/immutable-orm.svg)](https://badge.fury.io/js/immutable-orm)
An simple immutable ORM

# Install

## Install package

```bash
npm i immutable-orm --save
```

# Basic Usage

Import library

```javascript
import ORM, {Model} from 'immutable-orm';
```

Setup a new ORM

```javascript
const orm = new ORM();
const questionsModel = new Model('questions', [
	'id', 'name'
], {
	primaryKey: 'id',
	hasMany: 'answers',
});
const answersModel = new Model('answers', [
	'id', 'name'
], {
	primaryKey: 'id',
	belongsTo: 'question',
});

orm.addModel(questionsModel);
orm.addModel(answersModel);
```

Create some data

```javascript
let answers = [];
let questions = [];

questions.push(questionsModel.create({
	id: 1,
	name: "How are you?"
}));
answers.push(answersModel.create({
	id: 1,
	name: "Great!",
}));
questions[0].answers.add(answers[0]);
answers.push(answersModel.create({
	id: 2,
	name: "Good!",
}));
questions[0].answers.add(answers[1]);
answers.push(answersModel.create({
	id: 3,
	name: "FINE!",
}));
questions[0].answers.add(answers[2]);


questions.push(questionsModel.create({
	id: 2,
	name: "What is your favorite food?"
}));
answers.push(answersModel.create({
	id: 4,
	name: "Pizza!",
}));
questions[1].answers.add(answers[3]);
answers.push(answersModel.create({
	id: 5,
	name: "Hot Dogs!",
}));
questions[1].answers.add(answers[4]);
answers.push(answersModel.create({
	id: 6,
	name: "Spagetti!",
}));
questions[1].answers.add(answers[5]);
answers.push(answersModel.create({
	id: 7,
	name: "Potatoes!",
}));
questions[1].answers.add(answers[6]);
```

Query your data

```javascript
orm.questions.getRowByPrimaryKey(1);

orm.questions.getRowByPrimaryKey(1).answers.getRowByPrimaryKey();
```

# Redux Usage