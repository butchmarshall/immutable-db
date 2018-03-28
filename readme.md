# immutable-db [![npm version](https://badge.fury.io/js/immutable-db.svg)](https://badge.fury.io/js/immutable-db)
An simple immutable relational database

**This package is not production ready**

# Install

## Install package

```bash
npm i immutable-db --save
```

# Usage

Import library

```javascript
import Database, {Table} from 'immutable-db';
```

Create some data

```javascript
const database = new Database();
const questionsTable = new Table('questions', [
	'id', 'name'
], [{
	hasMany: 'answers',
}]);
const answersTable = new Table('answers', [
	'id', 'name'
], [{
	belongsTo: 'question',
}]);

database.addTable(questionsTable);
database.addTable(answersTable);
let answers = [];
let questions = [];

questions.push(questionsTable.create({
	id: 1,
	name: "How are you?"
}));
answers.push(answersTable.create({
	id: 1,
	name: "Great!",
}));
questions[0].answers.add(answers[0]);
answers.push(answersTable.create({
	id: 2,
	name: "Good!",
}));
questions[0].answers.add(answers[1]);
answers.push(answersTable.create({
	id: 3,
	name: "FINE!",
}));
questions[0].answers.add(answers[2]);


questions.push(questionsTable.create({
	id: 2,
	name: "What is your favorite food?"
}));
answers.push(answersTable.create({
	id: 4,
	name: "Pizza!",
}));
questions[1].answers.add(answers[3]);
answers.push(answersTable.create({
	id: 5,
	name: "Hot Dogs!",
}));
questions[1].answers.add(answers[4]);
answers.push(answersTable.create({
	id: 6,
	name: "Spagetti!",
}));
questions[1].answers.add(answers[5]);
answers.push(answersTable.create({
	id: 7,
	name: "Potatoes!",
}));
questions[1].answers.add(answers[6]);
```

Query your data

```javascript
database.questions.get(1);

database.questions.get(1).answers.get();
```