import Database, { Table } from './database';

describe("Database", () => {
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

	// ----------------------------------------------------------------------------
	// First question
	// ----------------------------------------------------------------------------
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

	// ----------------------------------------------------------------------------
	// Second question
	// ----------------------------------------------------------------------------
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

	console.log(database.toJS());

	it ('should allow fetching individual records', () => {
		expect(database.questions.getRowByPrimaryKey(1)).toEqual(questions[0]);
		expect(database.questions.getRowByPrimaryKey(2)).toEqual(questions[1]);

		answers.forEach((answer, answer_index) => {
			expect(database.answers.getRowByPrimaryKey(answer_index+1)).toEqual(answers[answer_index]);
		});

		expect(database.answers.getRowByPrimaryKey(1).question).toEqual(questions[0]);
		expect(database.answers.getRowByPrimaryKey(7).question).toEqual(questions[1]);
	});

	it ('should allow updating individual records', () => {
		expect(database.questions.getRowByPrimaryKey(1)).toEqual(questions[0]);

		database.questions.getRowByPrimaryKey(1).update({name: "How are you doing this fine evening?"});

		// The property should change
		expect(database.questions.getRowByPrimaryKey(1).name).toBe("How are you doing this fine evening?");
		// The references should remain
		expect(database.questions.getRowByPrimaryKey(1).answers.all().size).toEqual(3);
		// References object should change
		expect(database.questions.getRowByPrimaryKey(1)).not.toEqual(questions[0]);
	});

	it ('should return belongsTo relationships', () => {
		expect(database.answers.getRowByPrimaryKey(1).question).toEqual(questions[0]);
		expect(database.answers.getRowByPrimaryKey(7).question).toEqual(questions[1]);
	});

	it ('should return hasMany relationships', () => {
		expect(questions[0].answers.all().size).toEqual(3);
		expect(questions[1].answers.all().size).toEqual(4);

		// Ensure that the returned answers have the same reference
		let equalityChecks = 0;
		questions[0].answers.all().forEach((answer, answer_index) => {
			expect(answer).toEqual(answers[answer.id-1]);

			equalityChecks++;
		});
		questions[1].answers.all().forEach((answer, answer_index) => {
			expect(answer).toEqual(answers[answer.id-1]);

			equalityChecks++;
		});
		expect(equalityChecks).toEqual(7);
	});

	it ('should allow removing relationships', () => {
		questions[0].answers.remove(answers[0]);
		expect(questions[0].answers.all().size).toEqual(2);
	});

	it ('should allow removing records', () => {
		database.questions.remove(questions[0]);

		expect(database.questions.getRowByPrimaryKey(1)).toEqual(undefined);
	});

	it ('should do something', () => {
	});
});