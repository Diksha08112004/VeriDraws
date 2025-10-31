import { Box, Button, Card, CardBody, CardFooter, Divider, Heading, SimpleGrid, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useToast, VStack, HStack, Badge } from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useCallback } from 'react';
import { useDraw } from '@/contexts/DrawContext';
import { FiAward, FiUsers, FiPlusCircle, FiClock, FiDollarSign } from 'react-icons/fi';

const DrawCard = ({ draw, onJoinDraw, onPickWinner, isOwner = false }: { 
  draw: any; 
  onJoinDraw: (draw: any) => Promise<void>; 
  onPickWinner: (drawAddress: string) => Promise<void>;
  isOwner?: boolean;
}) => {
  const ticketPriceSol = draw.account.ticketPrice / 1e9; // Convert lamports to SOL
  const participantsCount = draw.account.participants?.length || 0;
  
  return (
    <Card key={draw.publicKey} variant="outline" _hover={{ transform: 'translateY(-4px)', shadow: 'md' }} transition="all 0.2s">
      <CardBody>
        <Stack spacing={3}>
          <HStack justify="space-between" align="start">
            <Heading size="md">{draw.account.name || 'Untitled Draw'}</Heading>
            {isOwner && (
              <Badge colorScheme="purple" px={2} py={1} borderRadius="md">
                Your Draw
              </Badge>
            )}
          </HStack>
          
          <Text color="gray.600" noOfLines={2}>
            {draw.account.description || 'No description provided'}
          </Text>
          
          <Divider my={2} />
          
          <VStack align="start" spacing={1}>
            <HStack>
              <FiDollarSign />
              <Text>Ticket Price: {ticketPriceSol} SOL</Text>
            </HStack>
            <HStack>
              <FiUsers />
              <Text>{participantsCount} / {draw.account.maxParticipants || '∞'} Participants</Text>
            </HStack>
            <HStack>
              <FiClock />
              <Text>Created: {new Date(draw.account.createdAt * 1000).toLocaleDateString()}</Text>
            </HStack>
            {draw.account.winner && (
              <HStack color="green.500">
                <FiAward />
                <Text>Winner: {draw.account.winner.toString().substring(0, 4)}...{draw.account.winner.toString().substring(draw.account.winner.toString().length - 4)}</Text>
              </HStack>
            )}
          </VStack>
        </Stack>
      </CardBody>
      <Divider />
      <CardFooter>
        <HStack spacing={4} w="full">
          {!isOwner && draw.account.isActive && (
            <Button
              colorScheme="blue"
              flex={1}
              onClick={() => onJoinDraw(draw)}
              isLoading={false}
              loadingText="Joining..."
            >
              Join for {ticketPriceSol} SOL
            </Button>
          )}
          {isOwner && draw.account.isActive && (
            <Button
              colorScheme="green"
              flex={1}
              onClick={() => onPickWinner(draw.publicKey)}
              isLoading={false}
              loadingText="Picking..."
              leftIcon={<FiAward />}
            >
              Pick Winner
            </Button>
          )}
          {!draw.account.isActive && (
            <Text color="gray.500" textAlign="center" w="full">
              This draw has ended
            </Text>
          )}
        </HStack>
      </CardFooter>
    </Card>
  );
};

export default function DrawList() {
  const { 
    draws, 
    myDraws, 
    joinedDraws, 
    availableDraws, 
    isLoading, 
    error, 
    joinDraw, 
    pickWinner, 
    fetchDraws 
  } = useDraw();
  
  const { publicKey } = useWallet();
  const toast = useToast();
  
  // Debug info
  console.log('DrawList - My Draws:', myDraws);
  console.log('DrawList - Joined Draws:', joinedDraws);
  console.log('DrawList - Available Draws:', availableDraws);
  console.log('DrawList - All Draws:', draws);
  console.log('DrawList - Loading:', isLoading);
  console.log('DrawList - Error:', error);

  const handleJoinDraw = useCallback(async (draw: any) => {
    try {
      await joinDraw({
        drawAddress: draw.publicKey.toString(),
        ticketPrice: draw.account.ticketPrice,
      });
      toast({
        title: 'Success',
        description: 'Successfully joined the draw!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error joining draw:', error);
      toast({
        title: 'Error',
        description: 'Failed to join draw. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [joinDraw, toast]);

  const handlePickWinner = useCallback(async (drawAddress: string) => {
    try {
      await pickWinner(drawAddress);
      toast({
        title: 'Success',
        description: 'Winner picked successfully!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error picking winner:', error);
      toast({
        title: 'Error',
        description: 'Failed to pick winner. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [pickWinner, toast]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Text>Loading draws...</Text>
        <Button mt={4} onClick={fetchDraws} isLoading={isLoading} loadingText="Refreshing">
          Refresh
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={8} color="red.500">
        <Text>Error: {error}</Text>
        <Button mt={4} onClick={fetchDraws} colorScheme="red">
          Retry
        </Button>
      </Box>
    );
  }

  if (draws.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text>No draws available. Create one to get started!</Text>
        <Text fontSize="sm" color="gray.500" mt={2}>
          (Make sure your program is deployed and the PROGRAM_ID is set correctly)
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={6} textAlign="right">
        <Button 
          onClick={fetchDraws} 
          size="sm" 
          colorScheme="blue" 
          variant="outline"
          isLoading={isLoading}
          loadingText="Refreshing"
        >
          Refresh Draws
        </Button>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mt={4}>
      {draws.map((draw) => (
        <Card key={draw.publicKey.toString()} variant="outline">
          <CardBody>
            <Stack spacing={3}>
              <Heading size="md">{draw.account.name}</Heading>
              <Text color="gray.600">{draw.account.description}</Text>
              <Divider />
              <Box>
                <Text fontSize="sm" color="gray.500">Ticket Price:</Text>
                <Text>◎ {draw.account.ticketPrice / 1e9} SOL</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Participants:</Text>
                <Text>
                  {draw.account.participants.length} / {draw.account.maxParticipants}
                </Text>
              </Box>
              {draw.account.winner && (
                <Box>
                  <Text fontSize="sm" color="gray.500">Winner:</Text>
                  <Text fontSize="sm" isTruncated>
                    {draw.account.winner.toString()}
                  </Text>
                </Box>
              )}
            </Stack>
          </CardBody>
          <CardFooter>
            <Stack width="100%">
              {publicKey && draw.account.creator.toString() === publicKey.toString() && !draw.account.winner && (
                <Button
                  colorScheme="green"
                  onClick={() => handlePickWinner(draw.publicKey.toString())}
                  isDisabled={!draw.account.isActive || draw.account.participants.length === 0}
                >
                  Pick Winner
                </Button>
              )}
              {publicKey && 
                draw.account.creator.toString() !== publicKey.toString() && 
                !draw.account.winner &&
                draw.account.isActive &&
                !draw.account.participants.some(p => p.toString() === publicKey.toString()) && (
                  <Button
                    colorScheme="blue"
                    onClick={() => handleJoinDraw(draw)}
                    isDisabled={!draw.account.isActive || draw.account.participants.length >= draw.account.maxParticipants}
                  >
                    Join for ◎ {draw.account.ticketPrice / 1e9} SOL
                  </Button>
                )}
            </Stack>
          </CardFooter>
        </Card>
      ))}
    </SimpleGrid>
    </Box>
  );
}
