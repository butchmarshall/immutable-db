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

	it ('should allow fetching individual records', () => {
		expect(database.questions.get(1)).toEqual(questions[0]);
		expect(database.questions.get(2)).toEqual(questions[1]);
	});

	it ('should return correct associative relationships', () => {
		expect(questions[0].answers.get().size).toEqual(3);
		expect(questions[1].answers.get().size).toEqual(4);

		// Ensure that the returned answers have the same reference
		let equalityChecks = 0;
		questions[0].answers.get().forEach((answer, answer_index) => {
			expect(answer).toEqual(answers[answer.id-1]);

			equalityChecks++;
		});
		questions[1].answers.get().forEach((answer, answer_index) => {
			expect(answer).toEqual(answers[answer.id-1]);

			equalityChecks++;
		});
		expect(equalityChecks).toEqual(7);
	});
});